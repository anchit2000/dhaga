import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay's checkout-handler signature: HMAC-SHA256 of `order_id|payment_id`
 * keyed by the API secret. Kept as a pure function (secret passed in, nothing
 * read from the environment, no network, no DB) so the security-critical
 * comparison is unit-testable without credentials — same split as
 * billing/index.ts's isUnlimitedAiSub.
 *
 * Compared with timingSafeEqual rather than `===`: the caller-supplied
 * signature is attacker-controlled, and a byte-by-byte early return leaks how
 * much of a forged prefix was correct. timingSafeEqual throws on a length
 * mismatch, so the length is checked first — a wrong length is a reject, not a
 * crash.
 */
export function isValidPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = createHmac("sha256", input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const received = input.signature;
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}
