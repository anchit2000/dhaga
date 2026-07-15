import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptOptionalToken,
  decryptToken,
  encryptOptionalToken,
  encryptToken,
} from "@/lib/crypto/tokens";

beforeAll(() => {
  process.env.CALENDAR_TOKEN_SECRET = "test-secret-for-calendar-tokens-abc123";
});

describe("calendar token encryption", () => {
  it("round-trips a token so a stored connection can still be used", () => {
    const token = "ya29.a0AfB_by-access-token";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("never persists the plaintext — the whole reason tokens aren't stored raw", () => {
    const token = "refresh-token-super-secret";
    const encrypted = encryptToken(token);
    expect(encrypted).not.toContain(token);
    expect(encrypted.startsWith("v1:")).toBe(true);
  });

  it("rejects tampered ciphertext (GCM auth tag) instead of returning garbage", () => {
    const encrypted = encryptToken("token");
    const data = encrypted.slice(3);
    const tampered = `v1:${data[0] === "A" ? "B" : "A"}${data.slice(1)}`;
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("passes null through for an absent refresh token", () => {
    expect(encryptOptionalToken(null)).toBeNull();
    expect(decryptOptionalToken(null)).toBeNull();
  });
});
