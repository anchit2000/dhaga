import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { getDb } from "@/lib/db";
import { getSignupGate } from "@/lib/hosted/gate";
import { notifyAccessRequested } from "@/lib/access/notify";
import { sendPasswordResetEmail, sendVerifyEmail } from "./emails";
import { buildPlugins } from "./plugins";
import { socialProviderConfig } from "./social";

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
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user.email, url);
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerifyEmail(user.email, url);
      },
    },
    socialProviders: socialProviderConfig(),
    user: {
      additionalFields: {
        isAdmin: { type: "boolean", defaultValue: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const gate = await getSignupGate();
            const { allowed, reason } = await gate.checkEmail(user.email);
            if (!allowed) {
              // The blocked signup attempt doubles as an access request, so
              // the same email just works once an admin approves it — no
              // separate "request access" step required first.
              await gate.requestAccess(user.email);
              await notifyAccessRequested(user.email);
              throw new APIError("FORBIDDEN", {
                message:
                  reason ?? "We've sent your access request — check your email once you're approved.",
              });
            }
            return { data: user };
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
