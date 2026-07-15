import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * At-rest encryption for calendar OAuth tokens (AES-256-GCM). This is the first
 * secret the app stores that isn't Better Auth's own — calendar access/refresh
 * tokens grant read access to a user's schedule, so they are never written to
 * the DB in plaintext (CLAUDE.md privacy rules). The key is derived from
 * CALENDAR_TOKEN_SECRET, falling back to the already-required BETTER_AUTH_SECRET;
 * with neither set we fail loud rather than store tokens weakly.
 *
 * Server-only (node:crypto) — never import from a "use client" component.
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const KEY_SALT = "dhaga-calendar-token-v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const store = globalThis as unknown as { __dhagaTokenKey?: { secret: string; key: Buffer } };

function deriveKey(): Buffer {
  const secret = process.env.CALENDAR_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Set CALENDAR_TOKEN_SECRET (or BETTER_AUTH_SECRET) — calendar OAuth tokens are encrypted at rest and can't be stored without it.",
    );
  }
  // Cache the derived key per secret value (scrypt is intentionally slow).
  if (store.__dhagaTokenKey?.secret !== secret) {
    store.__dhagaTokenKey = { secret, key: scryptSync(secret, KEY_SALT, 32) };
  }
  return store.__dhagaTokenKey.key;
}

/** Encrypt a token for storage. Returns "v1:<base64(iv | tag | ciphertext)>". */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

/** Inverse of encryptToken. Throws if the payload was tampered with or truncated. */
export function decryptToken(payload: string): string {
  const [version, data] = payload.split(":");
  if (version !== VERSION || !data) throw new Error("Unrecognized encrypted token format");
  const raw = Buffer.from(data, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** null-passthrough variants for the optional refresh token. */
export function encryptOptionalToken(plaintext: string | null): string | null {
  return plaintext == null ? null : encryptToken(plaintext);
}

export function decryptOptionalToken(payload: string | null): string | null {
  return payload == null ? null : decryptToken(payload);
}
