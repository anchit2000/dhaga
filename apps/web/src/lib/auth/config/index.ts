import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { getDb } from "@/lib/db";
import { getSignupGate } from "@/lib/hosted/gate";
import { notifyAccessRequested } from "@/lib/access/notify";
import { sendPasswordResetEmail, sendVerifyEmail, sendWelcomeEmail } from "./emails";
import { buildPlugins } from "./plugins";
import { socialProviderConfig } from "./social";
import type { User } from "better-auth";

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
  const gate = await getSignupGate();
  const { allowed, reason } = await gate.checkEmail(user.email);
  if (!allowed) {
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

/**
 * Lazily built and cached (not a top-level `await getDb()`): merely
 * *importing* this module must stay side-effect-free. Next.js's build-time
 * "collecting page data" step imports every route module in several worker
 * processes — a top-level DB connection there means each worker opens the
 * embedded PGlite file concurrently, which PGlite (single-process) can't
 * survive. Deferring the connection until the first real request avoids it.
 */
let authPromise: ReturnType<typeof buildAuth> | undefined;

async function buildAuth() {
  return betterAuth({
    database: drizzleAdapter(await getDb(), { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user.email, url);
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerifyEmail(user.email, url);
      },
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      afterEmailVerification: async (user) => {
        await sendWelcomeEmail(user.email).catch(() => undefined);
      },
    },
    onAPIError: { errorURL: "/auth/error" },
    socialProviders: socialProviderConfig(),
    user: {
      additionalFields: {
        isAdmin: { type: "boolean", defaultValue: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: beforeUserCreate,
          // OAuth providers can create an already-verified user, so they do
          // not pass through afterEmailVerification.
          after: async (user) => {
            if (user.emailVerified) {
              await sendWelcomeEmail(user.email).catch(() => undefined);
            }
          },
        },
      },
    },
    plugins: buildPlugins(),
  });
}

/** The single betterAuth() instance for the app — built once, cached. */
export function getAuth(): ReturnType<typeof buildAuth> {
  authPromise ??= buildAuth();
  return authPromise;
}
