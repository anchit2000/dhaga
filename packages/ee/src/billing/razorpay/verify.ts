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
 * Checkout-handler signature for a subscription payment.
 *
 * Pure (secret passed in, no env, no network, no DB) so the security-critical
 * comparison is unit-testable without credentials — same split as
 * billing/index.ts's isUnlimitedAiSub.
 *
 * NOTE the payload order: `payment_id|subscription_id`. Razorpay's one-time
 * Orders API signs the reverse (`order_id|payment_id`); if a one-time flow is
 * ever added back, it needs its own function rather than a swapped argument
 * here — getting it backwards rejects every genuine payment while looking
 * entirely reasonable.
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
