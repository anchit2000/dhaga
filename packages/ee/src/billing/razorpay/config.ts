/** Razorpay rejects anything under 1 rupee. */
export const MIN_AMOUNT_PAISE = 100;

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

/**
 * Pro is a Razorpay **Plan**, not an amount: the plan owns the price AND the
 * billing interval, so switching Pro from monthly to yearly is a dashboard
 * change with no code change, and the renewal date comes back from Razorpay
 * rather than being guessed at 365 days.
 *
 * Same shape as the Stripe path, where STRIPE_PRICE_* hold Dashboard ids
 * rather than literal amounts — an id can't be fat-fingered into a wrong
 * charge the way a paise integer can.
 */
export function proPlanId(): string {
  const id = process.env.RAZORPAY_PLAN_PRO;
  if (!id) throw new Error("RAZORPAY_PLAN_PRO is required to sell Pro through Razorpay.");
  return id;
}

/**
 * Lifetime stays an Order, not a Plan: it is a single payment with nothing to
 * renew, which is precisely what the Subscriptions API cannot express. So this
 * one is still an amount — in PAISE, minimum 100.
 *
 * Env-configured rather than hardcoded because the repo has no INR price for
 * anything: every price in utils/constants is USD.
 */
export function lifetimeAmountPaise(): number {
  const raw = process.env.RAZORPAY_PRICE_LIFETIME_INR;
  if (!raw) throw new Error("RAZORPAY_PRICE_LIFETIME_INR is required to sell Lifetime through Razorpay.");
  const paise = Number(raw);
  if (!Number.isInteger(paise) || paise < MIN_AMOUNT_PAISE) {
    throw new Error(`RAZORPAY_PRICE_LIFETIME_INR must be a whole number of paise >= ${MIN_AMOUNT_PAISE}.`);
  }
  return paise;
}
