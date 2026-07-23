import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OAuth plumbing shared by the calendar connect + callback routes: a signed,
 * short-lived `state` (CSRF defense) and the base URL the redirect_uri is built
 * from. The `state` is bound to the id of the user who initiated the flow, and
 * the callback rejects a state whose `uid` doesn't match the current session —
 * closing the OAuth-CSRF / connection-injection gap where an attacker's signed
 * state + code could otherwise be replayed to save their tokens under a victim.
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

export function signState(provider: string, userId: string): string {
  const payload = { provider, uid: userId, nonce: randomBytes(8).toString("hex"), ts: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string, provider: string, userId: string): boolean {
  const [body, sig] = state.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      provider: string;
      uid: string;
      ts: number;
    };
    return (
      payload.provider === provider &&
      payload.uid === userId &&
      Date.now() - payload.ts < STATE_TTL_MS
    );
  } catch {
    return false;
  }
}
