export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/**
 * Razorpay is optional even in hosted mode (an instance may sell through
 * Stripe only), so presence of the key pair is what turns the INR checkout on
 * — mirroring how getPlanSummary treats STRIPE_SECRET_KEY. The publishable
 * half is handed to the browser with the checkout handoff; the secret is read
 * here and never leaves the server.
 */
export function razorpayEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for Razorpay checkout.");
  }
  return { keyId, keySecret };
}

/** Per-endpoint secret from the dashboard — NOT the API key secret. */
export function getRazorpayWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is required to accept Razorpay webhooks.");
  return secret;
}

