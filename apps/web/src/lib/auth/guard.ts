import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getApprovalGate } from "@/lib/hosted/gate";
import { PENDING_APPROVAL_MESSAGE, PENDING_PATH } from "@/utils/constants/approval";
import { getAuth } from "./config";

/** Memoized per-request so layout + page both hitting this cost one lookup. */
export const getCurrentUser = cache(async () => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

/**
 * The hosted pending-approval gate, asked ONCE per request.
 *
 * Enforced here rather than in each of the ~120 route/action call sites: a
 * check that has to be remembered is a check that will be forgotten, and a
 * missed one hands an unapproved account the whole app. Everything downstream
 * of these three guards is therefore approved by construction.
 *
 * Always true without packages/ee (openApprovalGate) — a self-hosted core
 * instance has no waiting list, so this costs one resolved promise and no
 * query. On a hosted instance it is one indexed read on `user` by primary key,
 * memoized per request.
 */
export const isUserApproved = cache(async (userId: string): Promise<boolean> => {
  return (await getApprovalGate()).isApproved(userId);
});

/** For server actions: hard-fail without a session, or while unapproved. */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!(await isUserApproved(user.id))) throw new Error(PENDING_APPROVAL_MESSAGE);
  return user.id;
}

/** For pages: bounce unauthenticated visitors to /login, unapproved to /pending. */
export async function requireUserIdForPage(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isUserApproved(user.id))) redirect(PENDING_PATH);
  return user.id;
}

/**
 * Session only — no approval check. The narrow exception list, and it is
 * deliberately short: /pending itself (which would otherwise redirect to
 * itself forever) and the checkout endpoints that let a pending user PAY their
 * way in. Anything else must use requireUserId / requireUserIdForPage.
 */
export async function requireUserIdAllowingPending(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

/**
 * For API routes reachable by non-browser clients: cookie session first,
 * falling back to a per-user `x-api-key` header (replaces the old single
 * shared DHAGA_API_TOKEN — see the apiKey plugin in ./config.ts). An API key
 * belonging to an unapproved account is refused for the same reason its owner's
 * browser session is.
 */
export async function requireUserIdFromRequest(request: Request): Promise<string> {
  const userId = await userIdFromRequest(request);
  if (!(await isUserApproved(userId))) throw new Error(PENDING_APPROVAL_MESSAGE);
  return userId;
}

/** Same resolution, approval check skipped — see requireUserIdAllowingPending. */
export async function requireUserIdFromRequestAllowingPending(request: Request): Promise<string> {
  return userIdFromRequest(request);
}

async function userIdFromRequest(request: Request): Promise<string> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user) return session.user.id;

  const key = request.headers.get("x-api-key");
  if (key) {
    const result = await auth.api.verifyApiKey({ body: { key } });
    if (result.valid && result.key) return result.key.referenceId;
  }
  throw new Error("Unauthorized");
}
