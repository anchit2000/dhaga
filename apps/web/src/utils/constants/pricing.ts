/**
 * DISPLAY prices. The amount actually charged lives in the Stripe Price /
 * Razorpay Plan — these numbers only render the cards.
 *
 * Deliberately constants and NOT env vars. An env-overridable display price
 * can drift from the processor's real price, and the failure mode is showing a
 * customer $8 and charging them $10 — which is worse than a deploy. Keep these
 * in step with the dashboard; `docs/TESTING.md` §6b has the checklist.
 *
 * Sources, all from BRD §8.3 (measured 2026-07-30, margins 71–77%):
 *   Pro    $10/mo  |  $96/yr  ($8/mo effective)
 *   Power  $30/mo  |  $288/yr ($24/mo effective)
 * Lifetime is NOT in the BRD — $299 is set here, ~3.1× the annual price. It
 * carries an uncapped credit allowance, so its true cost is unbounded and only
 * the dollar ceiling (~$16/mo, ai-budget.ts) limits it. Revisit before volume.
 *
 * INR is approximate parity at ~₹87/USD rounded to clean figures, NOT a PPP
 * discount — so the BRD's margin arithmetic carries over unchanged. If you want
 * India priced lower, that is a margin decision to make explicitly.
 */
export type BillingTier = "pro" | "power";
export type BillingCadence = "monthly" | "yearly";
export type Currency = "USD" | "INR";

export interface DisplayPrice {
  /** What the customer pays for one billing period. */
  amount: number;
  /** Undiscounted comparison price, when the plan is sold at a saving. */
  originalAmount?: number;
  /** Per-month equivalent, for the "$8/mo billed yearly" line. */
  perMonth: number;
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", INR: "₹" };

export const PRICES: Record<Currency, Record<BillingTier, Record<BillingCadence, DisplayPrice>>> = {
  USD: {
    pro: {
      monthly: { amount: 10, perMonth: 10 },
      yearly: { amount: 96, perMonth: 8, originalAmount: 120 },
    },
    power: {
      monthly: { amount: 30, perMonth: 30 },
      yearly: { amount: 288, perMonth: 24, originalAmount: 360 },
    },
  },
  INR: {
    pro: {
      monthly: { amount: 899, perMonth: 899 },
      yearly: { amount: 8499, perMonth: 708, originalAmount: 10788 },
    },
    power: {
      monthly: { amount: 2599, perMonth: 2599 },
      yearly: { amount: 24999, perMonth: 2083, originalAmount: 31188 },
    },
  },
};

export const LIFETIME_PRICE: Record<Currency, DisplayPrice> = {
  USD: { amount: 299, perMonth: 0 },
  INR: { amount: 25999, perMonth: 0 },
};

/**
 * First-500-seats offer on Pro's first year (BRD §8.4). Shown separately from
 * standard billing so it is never confused with the ongoing price — year two
 * renews at the normal yearly figure.
 */
export const PRO_FIRST_YEAR_OFFER: Record<Currency, DisplayPrice> = {
  USD: { amount: 79, perMonth: 7, originalAmount: 96 },
  INR: { amount: 6999, perMonth: 583, originalAmount: 8499 },
};

export const TIER_LABEL: Record<BillingTier, string> = { pro: "Pro", power: "Power" };

export const CADENCE_LABEL: Record<BillingCadence, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
};

/** Whole-number percent saved by paying yearly, for the "Save 20%" badge. */
export function yearlySavingPercent(currency: Currency, tier: BillingTier): number {
  const { amount, originalAmount } = PRICES[currency][tier].yearly;
  if (!originalAmount) return 0;
  return Math.round(((originalAmount - amount) / originalAmount) * 100);
}

export function formatPrice(currency: Currency, amount: number): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
}
