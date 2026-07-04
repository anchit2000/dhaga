import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { apiKey } from "@better-auth/api-key";
import { APIError } from "better-auth/api";
import { getDb } from "@/lib/db";
import { getSignupGate } from "@/lib/hosted/gate";

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
    emailAndPassword: { enabled: true },
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
              throw new APIError("FORBIDDEN", {
                message: reason ?? "This email hasn't been invited yet.",
              });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [apiKey(), nextCookies()],
  });
}

/** The single betterAuth() instance for the app — built once, cached. */
export function getAuth(): ReturnType<typeof buildAuth> {
  authPromise ??= buildAuth();
  return authPromise;
}
