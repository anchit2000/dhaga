import { afterEach, describe, expect, it } from "vitest";
import { verifyInbound, verifyWebhookChallenge } from "../whatsapp-client/api";

/**
 * Credentials are read from the environment TRIMMED. These tests exist because
 * an untrimmed value fails far from its cause, and each of the three
 * credentials fails in a different, equally misleading way:
 *
 *   - the access token surfaces as a TypeError from inside undici, because a
 *     BOM cannot be encoded into an HTTP header's ByteString;
 *   - the verify token silently 403s the subscribe handshake, so Meta reports
 *     only "the callback URL could not be validated";
 *   - the app secret changes the HMAC key, so every inbound message is rejected
 *     as unauthorized — indistinguishable from a forged payload.
 *
 * U+FEFF is the realistic culprit (a Windows shell pipe or an "UTF-8 with BOM"
 * save prepends it) and is invisible in every UI you would inspect the value
 * in. A trailing newline from a copy-paste into a dashboard field is the same
 * class of bug. If someone removes the trim() calls, these fail.
 */

const BOM = "﻿";
const APP_SECRET = "test-app-secret";

afterEach(() => {
  delete process.env.WHATSAPP_VERIFY_TOKEN;
  delete process.env.WHATSAPP_APP_SECRET;
});

function subscribeQuery(token: string): URLSearchParams {
  return new URLSearchParams({
    "hub.mode": "subscribe",
    "hub.verify_token": token,
    "hub.challenge": "challenge-123",
  });
}

describe("whatsapp credentials are read trimmed", () => {
  it("answers the subscribe handshake when the stored verify token carries a BOM", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = `${BOM}verify-token`;
    // Meta echoes back the token as configured in the dashboard — clean. Only
    // our stored copy is polluted, so an untrimmed read makes these unequal.
    expect(verifyWebhookChallenge(subscribeQuery("verify-token"))).toBe("challenge-123");
  });

  it("still rejects a genuinely wrong verify token", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";
    expect(verifyWebhookChallenge(subscribeQuery("not-the-token"))).toBeNull();
  });

  it("accepts a correctly signed payload when the stored app secret carries a BOM", async () => {
    process.env.WHATSAPP_APP_SECRET = `${BOM}${APP_SECRET}`;
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    // Meta signs with the real secret; only our stored copy is polluted, so an
    // untrimmed read computes a different HMAC and rejects every message.
    const { createHmac } = await import("node:crypto");
    const signature = `sha256=${createHmac("sha256", APP_SECRET).update(rawBody, "utf8").digest("hex")}`;
    const headers = new Headers({ "x-hub-signature-256": signature });
    expect(verifyInbound({ headers, rawBody })).toBe(true);
  });

  it("still rejects a payload signed with the wrong secret", async () => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
    const { createHmac } = await import("node:crypto");
    const signature = `sha256=${createHmac("sha256", "wrong-secret").update(rawBody, "utf8").digest("hex")}`;
    const headers = new Headers({ "x-hub-signature-256": signature });
    expect(verifyInbound({ headers, rawBody })).toBe(false);
  });

  it("treats a whitespace-only credential as unset, so nothing can match it", () => {
    // The presented token is byte-identical to the stored one. Without the trim
    // that is an EQUAL comparison and the handshake succeeds — anyone who can
    // guess "this instance's verify token is blank" completes it. Trimmed, the
    // credential reads as unset and the challenge is refused.
    const whitespaceOnly = `  ${BOM} `;
    process.env.WHATSAPP_VERIFY_TOKEN = whitespaceOnly;
    expect(verifyWebhookChallenge(subscribeQuery(whitespaceOnly))).toBeNull();
  });
});
