import { randomInt } from "node:crypto";

/**
 * Unambiguous uppercase base32 (Crockford) alphabet — excludes I, L, O, U, so
 * a code read off a screen or spoken aloud transcribes cleanly (no 0/O, 1/I/L
 * confusion). 32 symbols exactly.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Number of random chars in a referral code. Mirrors REFERRAL_CODE_LENGTH in
 * apps/web/src/utils/constants/referral.ts — packages/ee must not import from
 * apps/web (the open-core boundary is one-directional), so the literal is
 * duplicated deliberately. Keep the two in sync.
 */
const CODE_LENGTH = 8;

/**
 * Generate a random referral code. Uses crypto.randomInt (a CSPRNG, and
 * rejection-sampled internally so the draw is unbiased across the 32-char
 * alphabet) — never Math.random, whose weak, predictable entropy invites
 * guessable and colliding codes.
 */
export function generateCode(length: number = CODE_LENGTH): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Canonicalize an inbound code (from a `?ref=` param or the signup form) to the
 * stored form: trimmed and uppercased. Returns "" for nullish/empty input so
 * callers can reject it before touching the database.
 */
export function normalizeCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}
