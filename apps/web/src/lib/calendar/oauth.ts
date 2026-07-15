import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OAuth plumbing shared by the calendar connect + callback routes: a signed,
 * short-lived `state` (CSRF defense) and the base URL the redirect_uri is built
 * from. The connection is always stored under the logged-in session's user
 * (the callback re-checks the session), so state only needs to be unforgeable
 * and fresh, not to carry identity.
 */

const STATE_TTL_MS = 10 * 60_000;

function secret(): string {
  const value = process.env.CALENDAR_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!value) {
    throw new Error("Set CALENDAR_TOKEN_SECRET (or BETTER_AUTH_SECRET) to connect a calendar.");
  }
  return value;
}

/** Prefer the configured public URL; fall back to the request's own origin. */
export function oauthBaseUrl(request: Request): string {
  return process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
}

export function signState(provider: string): string {
  const payload = { provider, nonce: randomBytes(8).toString("hex"), ts: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string, provider: string): boolean {
  const [body, sig] = state.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      provider: string;
      ts: number;
    };
    return payload.provider === provider && Date.now() - payload.ts < STATE_TTL_MS;
  } catch {
    return false;
  }
}
