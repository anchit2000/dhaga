import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidPaymentSignature } from "../verify";

/**
 * WHY THIS SUITE EXISTS: this signature is the entire authorization for a
 * Razorpay payment. The verify route has a logged-in session, but the session
 * only says WHO is asking — it says nothing about whether money moved. If this
 * function returns true for anything Razorpay didn't sign, a user can hand the
 * server three strings and be upgraded to Pro for free.
 *
 * Each case below is therefore a specific way to get a free plan, not a
 * restatement of the HMAC formula.
 */
const KEY_SECRET = "test_secret_do_not_use";
const ORDER_ID = "order_ABC123";
const PAYMENT_ID = "pay_XYZ789";

function sign(payload: string, secret = KEY_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("isValidPaymentSignature", () => {
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
    // The attack: pay 100 paise on a cheap order, then present that payment's
    // signature against an expensive order id. Binding both ids into the
    // payload is what stops it.
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
    // Someone who guesses the payload format but not the secret gets nothing.
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
    // timingSafeEqual throws on unequal buffers. An empty or truncated
    // signature must be a plain `false` — a thrown error inside the route
    // could surface as a 500 and read as "try again" instead of "denied".
    for (const signature of ["", "abc", `${sign(`${ORDER_ID}|${PAYMENT_ID}`)}extra`]) {
      expect(() =>
        isValidPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature, keySecret: KEY_SECRET }),
      ).not.toThrow();
      expect(
        isValidPaymentSignature({ orderId: ORDER_ID, paymentId: PAYMENT_ID, signature, keySecret: KEY_SECRET }),
      ).toBe(false);
    }
  });

  it("rejects a payload assembled without the separator", () => {
    // `order|payment` vs `orderpayment` — without the delimiter, distinct
    // id pairs could collide onto one payload and share a signature.
    expect(
      isValidPaymentSignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: sign(`${ORDER_ID}${PAYMENT_ID}`),
        keySecret: KEY_SECRET,
      }),
    ).toBe(false);
  });
});
