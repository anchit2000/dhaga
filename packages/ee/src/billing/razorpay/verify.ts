import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Constant-time hex-digest comparison. The caller-supplied signature is
 * attacker-controlled, and a byte-by-byte early return leaks how much of a
 * forged prefix was correct. timingSafeEqual throws on a length mismatch, so
 * the length is checked first — a wrong length is a reject, not a crash.
 */
function matches(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(received, "utf8"));
}

function hmacHex(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Checkout-handler signature for a ONE-TIME payment (Orders API, i.e.
 * Lifetime): HMAC-SHA256 of `order_id|payment_id` keyed by the API secret.
 *
 * Pure (secret passed in, no env, no network, no DB) so the security-critical
 * comparison is unit-testable without credentials — same split as
 * billing/index.ts's isUnlimitedAiSub.
 */
export function isValidPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  return matches(hmacHex(`${input.orderId}|${input.paymentId}`, input.keySecret), input.signature);
}

/**
 * Checkout-handler signature for a RECURRING payment (Subscriptions API, i.e.
 * Pro).
 *
 * The payload order is REVERSED relative to the one-time case above:
 * `payment_id|subscription_id`, not `subscription_id|payment_id`. Reusing the
 * Orders helper here would reject every genuine subscription payment while
 * looking perfectly reasonable, so the two are deliberately separate functions
 * rather than one with a swappable argument.
 */
export function isValidSubscriptionSignature(input: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  return matches(
    hmacHex(`${input.paymentId}|${input.subscriptionId}`, input.keySecret),
    input.signature,
  );
}

/**
 * Webhook signature: HMAC-SHA256 of the RAW request body, keyed by the WEBHOOK
 * secret — a different secret from the API key secret, configured per endpoint
 * in the Razorpay dashboard. Passing the API secret here fails every event.
 *
 * The body must be the exact bytes received: re-serializing parsed JSON can
 * reorder keys or change spacing and will not match.
 */
export function isValidWebhookSignature(input: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  return matches(hmacHex(input.rawBody, input.webhookSecret), input.signature);
}
