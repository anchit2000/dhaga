import { APIError } from "better-auth/api";
import { getDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema";
import { getApprovalGate, getSignupGate } from "@/lib/hosted/gate";
import { notifyAccessRequested } from "@/lib/access/notify";
import type { User } from "better-auth";

/**
 * Single-user guard for the AGPL core (non-EE) path. Multi-tenant isolation
 * (per-user RLS scoping) lives exclusively in packages/ee; the core `getDb()`
 * hands every request one unscoped connection over one shared graph (see
 * lib/db/request-scope.ts). That is safe for exactly one account, but nothing
 * otherwise stops a second signup from landing in — and reading — the first
 * user's data. So when hosted mode is off (`DHAGA_HOSTED_MODE` !== "true",
 * the same signal lib/hosted/gate.ts uses to decide whether packages/ee is
 * loaded) we reject creating a second account. Multi-user requires hosted
 * mode / packages/ee — see docs/SELF_HOSTING.md.
 */
async function assertSingleUserOnCore(): Promise<void> {
  if (process.env.DHAGA_HOSTED_MODE === "true") return;
  const db = await getDb();
  const [existing] = await db.select({ id: authUser.id }).from(authUser).limit(1);
  if (existing) {
    throw new APIError("FORBIDDEN", {
      message:
        "This Dhaga instance is single-user: the open-source core has no per-user data isolation, so it allows only one account. Multi-user support requires hosted mode (packages/ee) — see docs/SELF_HOSTING.md.",
    });
  }
}

/**
 * better-auth's `user.create.before` hook.
 *
 * Signup is OPEN. This used to file an access request and then throw FORBIDDEN
 * so no account was ever created on a gated hosted instance; under "payment is
 * the invite" the account is always created and the waiting list moved to
 * *after* the account exists (see grantOrRequestApproval below, and
 * lib/hosted/gate's ApprovalGate). The only signup this still refuses is a
 * second account on a core instance, which is a data-isolation bug, not a
 * business rule.
 */
export async function beforeUserCreate(
  user: User & Record<string, unknown>,
): Promise<{ data: User & Record<string, unknown> } | void> {
  await assertSingleUserOnCore();
  return { data: user };
}

/**
 * better-auth's `user.create.after` hook, approval half. Decides whether the
 * brand-new account walks straight in or lands on /pending:
 *
 *  - the signup gate already knows the email (an admin approved the access
 *    request before they signed up, or they're a DHAGA_ADMIN_EMAILS bootstrap
 *    admin) → approved immediately;
 *  - otherwise → unapproved, and the signup doubles as the access request, so
 *    the admin queue lists them and approving it lets them in with no second
 *    step.
 *
 * Never throws. The account exists by the time this runs, so a failure here
 * must not turn a completed signup into an error page — the worst case is an
 * account that sits on /pending until an admin or a payment moves it, which is
 * exactly where an unapproved account belongs. notifyAccessRequested is
 * best-effort for the same reason: the confirmation email is a courtesy.
 */
export async function grantOrRequestApproval(user: {
  id: string;
  email: string;
}): Promise<void> {
  const gate = await getSignupGate();
  const { allowed } = await gate.checkEmail(user.email);
  // A referral invite code deliberately does NOT approve. It still earns the
  // referrer their reward (EE's recordReferral, also in create.after), but the
  // only two ways past the queue are an admin and a confirmed payment —
  // otherwise anyone holding a code walks around the wall.
  if (allowed) {
    await (await getApprovalGate()).approve(user.id);
    return;
  }
  const submitted = await gate.requestAccess(user.email);
  if (submitted) {
    try {
      await notifyAccessRequested(user.email);
    } catch {
      // Swallowed deliberately: an email-provider hiccup (lib/email/send.ts,
      // via Resend) must not take down a signup that already succeeded.
    }
  }
}
