import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./config";

/** Memoized per-request so layout + page both hitting this cost one lookup. */
export const getCurrentUser = cache(async () => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

/** For server actions: hard-fail without a session. */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}

/** For pages: bounce unauthenticated visitors to /login. */
export async function requireUserIdForPage(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.id;
}

/**
 * For API routes reachable by non-browser clients: cookie session first,
 * falling back to a per-user `x-api-key` header (replaces the old single
 * shared DHAGA_API_TOKEN — see the apiKey plugin in ./config.ts).
 */
export async function requireUserIdFromRequest(request: Request): Promise<string> {
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
