import { afterEach, describe, expect, it } from "vitest";
import { verifyTelegramSecret } from "@/lib/telegram";

/**
 * The webhook secret header is the *only* thing standing between the public
 * internet and contact capture/query (docs/checklist.md §16 — "owner-only,
 * secret-verified"). These tests encode why each branch matters, not just
 * what it returns.
 */
describe("verifyTelegramSecret", () => {
  const original = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
    else process.env.TELEGRAM_WEBHOOK_SECRET = original;
  });

  it("accepts the exact configured secret", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cr3t-token";
    expect(verifyTelegramSecret("s3cr3t-token")).toBe(true);
  });

  it("rejects a wrong secret — otherwise anyone could POST fake Telegram updates and trigger capture", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cr3t-token";
    expect(verifyTelegramSecret("wrong-token")).toBe(false);
  });

  it("rejects a missing header", () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cr3t-token";
    expect(verifyTelegramSecret(null)).toBe(false);
  });

  it("rejects a same-prefix secret of a different length without throwing", () => {
    // Regression: comparing with crypto.timingSafeEqual throws on
    // mismatched buffer lengths — an attacker (or just a misconfigured
    // client) sending a shorter/longer header must be rejected, not crash
    // the route.
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cr3t-token";
    expect(() => verifyTelegramSecret("s3cr3t")).not.toThrow();
    expect(verifyTelegramSecret("s3cr3t")).toBe(false);
  });

  it("fails closed when no secret is configured at all", () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    expect(verifyTelegramSecret("anything")).toBe(false);
  });
});
