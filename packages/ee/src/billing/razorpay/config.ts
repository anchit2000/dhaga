import type { SubscriptionPlan } from "../../db/schema";

/** Razorpay rejects anything under 1 rupee. */
export const MIN_AMOUNT_PAISE = 100;

/** Prepaid Pro is sold as a fixed term, not a renewing mandate — see index.ts. */
export const PRO_TERM_DAYS = 365;

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

/**
 * Razorpay is optional even in hosted mode (an instance may sell through
 * Stripe only), so presence of the key pair is what turns the INR checkout on
 * — mirroring how getPlanSummary treats STRIPE_SECRET_KEY. The publishable
 * half is also exposed to the browser as NEXT_PUBLIC_RAZORPAY_KEY_ID; the
 * secret is read here and never leaves the server.
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

/**
 * Amount in paise, resolved SERVER-SIDE from the plan — never from the request
 * body. A client-supplied amount would let anyone buy Pro for one rupee.
 *
 * Env-configured rather than hardcoded because the repo has no INR price for
 * anything: every price in utils/constants is USD ($96/yr Pro), and baking in
 * an exchange rate would silently rot. Same shape as the Stripe path, where
 * STRIPE_PRICE_* hold Dashboard price IDs rather than literal amounts.
 */
export function amountPaiseFor(plan: SubscriptionPlan): number {
  const raw =
    plan === "lifetime"
      ? process.env.RAZORPAY_PRICE_LIFETIME_INR
      : process.env.RAZORPAY_PRICE_PRO_INR;
  if (!raw) throw new Error(`Missing Razorpay price env var for plan "${plan}".`);
  const paise = Number(raw);
  if (!Number.isInteger(paise) || paise < MIN_AMOUNT_PAISE) {
    throw new Error(
      `Razorpay price for plan "${plan}" must be a whole number of paise >= ${MIN_AMOUNT_PAISE}.`,
    );
  }
  return paise;
}
