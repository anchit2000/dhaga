import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Single-user session tokens. The token is a keyed HMAC — no user table yet;
 * possession of the token proves the password was entered. Server-only.
 */

function secretMaterial(): string | null {
  return process.env.DHAGA_SESSION_SECRET ?? process.env.DHAGA_PASSWORD ?? null;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DHAGA_PASSWORD);
}

export function sessionToken(): string {
  const secret = secretMaterial();
  if (!secret) throw new Error("DHAGA_PASSWORD is not configured");
  return createHmac("sha256", secret).update("dhaga-session-v1").digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !isAuthConfigured()) return false;
  return constantTimeEquals(token, sessionToken());
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.DHAGA_PASSWORD;
  if (!expected) return false;
  return constantTimeEquals(password, expected);
}
