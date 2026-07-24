import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/db";
import {
  grantReferralRewardOnVerification,
  recordReferralFromCookie,
} from "@/lib/referral";
import { sendPasswordResetEmail, sendVerifyEmail, sendWelcomeEmail } from "./emails";
import { buildPlugins } from "./plugins";
import { socialProviderConfig } from "./social";
import { previewTrustedOrigins } from "./trusted-origins";
import { beforeUserCreate } from "./signup-hooks";

/** Re-exported so `@/lib/auth/config` stays the stable import for both the
 *  auth wiring and the vitest suites (the signup-gate logic lives in
 *  ./signup-hooks). */
export { beforeUserCreate };

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
    // baseURL + BETTER_AUTH_TRUSTED_ORIGINS are trusted natively; this adds the
    // current Vercel preview deployment's own URLs. See ./trusted-origins.
    trustedOrigins: previewTrustedOrigins(),
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
        // Two-sided reward, once the referee has proven their email.
        await grantReferralRewardOnVerification(user.id);
      },
    },
    onAPIError: { errorURL: "/auth/error" },
    socialProviders: socialProviderConfig(),
    // Privacy rule: provider OAuth tokens (access/refresh/id) must never sit in
    // the DB as plaintext — better-auth AES-256-GCM-encrypts them at rest, the
    // same posture as the calendar tokens.
    account: { encryptOAuthTokens: true },
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
            // Record the pending referral (best-effort; never blocks signup).
            await recordReferralFromCookie(user.id, user.email);
            // OAuth signups can arrive already-verified and so never reach
            // afterEmailVerification — fire their reward here instead.
            if (user.emailVerified) {
              await grantReferralRewardOnVerification(user.id);
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
