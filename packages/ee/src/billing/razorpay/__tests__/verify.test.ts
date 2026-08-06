import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidSubscriptionSignature, isValidWebhookSignature } from "../verify";

/**
 * WHY THIS SUITE EXISTS: these signatures are the entire authorization for a
 * Razorpay payment. The verify route has a logged-in session, but the session
 * only says WHO is asking — it says nothing about whether money moved. If
 * either returns true for something Razorpay didn't sign, a user can hand the
 * server a few strings and be upgraded for free.
 *
 * Each case is a specific way to get a free plan, not a restatement of the
 * HMAC formula.
 */
const KEY_SECRET = "test_api_secret";
const WEBHOOK_SECRET = "test_webhook_secret";
const SUBSCRIPTION_ID = "sub_ABC123";
const PAYMENT_ID = "pay_XYZ789";

function sign(payload: string, secret = KEY_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("isValidSubscriptionSignature", () => {
  it("accepts the signature Razorpay actually produces", () => {
    expect(
      isValidSubscriptionSignature({
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(true);
  });

  it("rejects the reversed payload order", () => {
    // Razorpay's one-time Orders API signs `id|payment`; subscriptions sign
    // `payment|id`. Pinning the order here means a future one-time flow can't
    // be wired up by reusing this function and silently rejecting everything.
    expect(
      isValidSubscriptionSignature({
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${SUBSCRIPTION_ID}|${PAYMENT_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a real signature replayed onto another subscription", () => {
    // Pay on a cheap subscription, then present that payment's signature
    // against an expensive one. Binding both ids into the payload stops it.
    expect(
      isValidSubscriptionSignature({
        subscriptionId: "sub_SOMEONE_ELSE",
        paymentId: PAYMENT_ID,
        signature: sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a signature minted with the wrong secret", () => {
    expect(
      isValidSubscriptionSignature({
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`, "attacker_secret"),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects rather than throws when the signature is the wrong length", () => {
    // timingSafeEqual throws on unequal buffers. A truncated signature must be
    // a plain `false` — a thrown error could surface as a 500 and read as
    // "try again" instead of "denied".
    for (const signature of ["", "abc", `${sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`)}extra`]) {
      const args = {
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature,
        keySecret: KEY_SECRET,
      };
      expect(() => isValidSubscriptionSignature(args)).not.toThrow();
      expect(isValidSubscriptionSignature(args)).toBe(false);
    }
  });
});

describe("isValidWebhookSignature", () => {
  const RAW_BODY = '{"event":"subscription.charged","payload":{}}';

  it("accepts a body signed with the webhook secret", () => {
    expect(
      isValidWebhookSignature({
        rawBody: RAW_BODY,
        signature: sign(RAW_BODY, WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(true);
  });

  it("rejects a body signed with the API secret", () => {
    // The webhook secret is a DIFFERENT secret, configured per endpoint. Using
    // the API key secret is the most likely misconfiguration, and it must fail
    // closed rather than accept unsigned-in-practice events.
    expect(
      isValidWebhookSignature({
        rawBody: RAW_BODY,
        signature: sign(RAW_BODY, KEY_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a body altered after signing", () => {
    // Someone replaying a genuine event with the plan swapped gets nothing.
    expect(
      isValidWebhookSignature({
        rawBody: RAW_BODY.replace("subscription.charged", "subscription.halted"),
        signature: sign(RAW_BODY, WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });
});
