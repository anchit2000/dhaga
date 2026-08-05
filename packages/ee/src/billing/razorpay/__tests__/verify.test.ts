import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isValidPaymentSignature,
  isValidSubscriptionSignature,
  isValidWebhookSignature,
} from "../verify";

/**
 * WHY THIS SUITE EXISTS: these signatures are the entire authorization for a
 * Razorpay payment. The verify route has a logged-in session, but the session
 * only says WHO is asking — it says nothing about whether money moved. If any
 * of these returns true for something Razorpay didn't sign, a user can hand the
 * server a few strings and be upgraded for free.
 *
 * Each case is a specific way to get a free plan, not a restatement of the
 * HMAC formula.
 */
const KEY_SECRET = "test_api_secret";
const WEBHOOK_SECRET = "test_webhook_secret";
const ORDER_ID = "order_ABC123";
const SUBSCRIPTION_ID = "sub_ABC123";
const PAYMENT_ID = "pay_XYZ789";

function sign(payload: string, secret = KEY_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("isValidPaymentSignature (one-time / Orders)", () => {
  it("accepts the signature Razorpay actually produces", () => {
    expect(
      isValidPaymentSignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${ORDER_ID}|${PAYMENT_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(true);
  });

  it("rejects a real signature replayed onto a different order", () => {
    // Pay 100 paise on a cheap order, then present that payment's signature
    // against an expensive one. Binding both ids into the payload stops it.
    expect(
      isValidPaymentSignature({
        orderId: "order_EXPENSIVE",
        paymentId: PAYMENT_ID,
        signature: sign(`${ORDER_ID}|${PAYMENT_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a signature minted with the wrong secret", () => {
    expect(
      isValidPaymentSignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${ORDER_ID}|${PAYMENT_ID}`, "attacker_secret"),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects rather than throws when the signature is the wrong length", () => {
    // timingSafeEqual throws on unequal buffers. A truncated signature must be
    // a plain `false` — a thrown error could surface as a 500 and read as
    // "try again" instead of "denied".
    for (const signature of ["", "abc", `${sign(`${ORDER_ID}|${PAYMENT_ID}`)}extra`]) {
      const args = { orderId: ORDER_ID, paymentId: PAYMENT_ID, signature, keySecret: KEY_SECRET };
      expect(() => isValidPaymentSignature(args)).not.toThrow();
      expect(isValidPaymentSignature(args)).toBe(false);
    }
  });
});

describe("isValidSubscriptionSignature (recurring / Subscriptions)", () => {
  it("accepts the reversed payload Razorpay signs for subscriptions", () => {
    expect(
      isValidSubscriptionSignature({
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(true);
  });

  it("rejects the Orders payload order — the two are NOT interchangeable", () => {
    // THE regression test for this integration. Orders sign `id|payment`,
    // subscriptions sign `payment|id`. Collapsing these into one helper would
    // reject every genuine Pro payment while looking entirely reasonable.
    expect(
      isValidSubscriptionSignature({
        subscriptionId: SUBSCRIPTION_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${SUBSCRIPTION_ID}|${PAYMENT_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });

  it("rejects a subscription signature replayed onto another subscription", () => {
    expect(
      isValidSubscriptionSignature({
        subscriptionId: "sub_SOMEONE_ELSE",
        paymentId: PAYMENT_ID,
        signature: sign(`${PAYMENT_ID}|${SUBSCRIPTION_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
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
        rawBody: RAW_BODY.replace("subscription.charged", "payment.captured"),
        signature: sign(RAW_BODY, WEBHOOK_SECRET),
        webhookSecret: WEBHOOK_SECRET,
      }),
    ).toBe(false);
  });
});

