import { APIError } from "better-auth/api";
import { getDb } from "@/lib/db";
import { authUser } from "@/lib/db/schema";
import { getSignupGate } from "@/lib/hosted/gate";
import { notifyAccessRequested } from "@/lib/access/notify";
import { isReferralBypassAllowed } from "@/lib/referral";
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
 * The signup gate's `create.before` hook body — extracted (rather than left
 * inline) so it's independently unit-testable. notifyAccessRequested sends
 * up to two emails (lib/email/send.ts, via Resend); a transient
 * provider/network failure there must never replace the intended
 * `APIError("FORBIDDEN", ...)` below with an unrelated 500 — the
 * confirmation email is a courtesy, not something the signup rejection can
 * be blocked on. This call site can't reach for next/server's after() the
 * way the other notifyAccessRequested caller (api/access-requests/route.ts)
 * does: better-auth's own types allow the hook's `context` to be null (it
 * isn't guaranteed to run inside an active Next.js request scope), and this
 * exact function also runs directly against a plain DB connection under
 * vitest with no HTTP request in play at all — after() would throw there.
 * A plain try/catch works in every one of those cases.
 */
export async function beforeUserCreate(
  user: User & Record<string, unknown>,
): Promise<{ data: User & Record<string, unknown> } | void> {
  await assertSingleUserOnCore();
  const gate = await getSignupGate();
  const { allowed, reason } = await gate.checkEmail(user.email);
  if (!allowed) {
    // A genuinely valid invite code lets a referred user past the
    // access-request wall. EE's recordReferral (fired in create.after) is the
    // authoritative self-referral/duplicate/cap guard — this only trusts a
    // valid code, and best-effort: a failure here just keeps the normal
    // allowlist path below.
    if (await isReferralBypassAllowed()) {
      return { data: user };
    }
    // The blocked signup attempt doubles as an access request, so
    // the same email just works once an admin approves it — no
    // separate "request access" step required first.
    const submitted = await gate.requestAccess(user.email);
    if (submitted) {
      try {
        await notifyAccessRequested(user.email);
      } catch {
        // Swallowed deliberately: the FORBIDDEN rejection below must always
        // reach the caller, regardless of whether this best-effort
        // confirmation email succeeds.
      }
    }
    throw new APIError("FORBIDDEN", {
      message:
        reason ?? "We've sent your access request — check your email once you're approved.",
    });
  }
  return { data: user };
}
