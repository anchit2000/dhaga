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
 *
 * Every plan is recurring. There is no one-time purchase.
 *
 * INR is approximate parity at ~₹87/USD rounded to clean figures, NOT a PPP
 * discount — so the BRD's margin arithmetic carries over unchanged. If you want
 * India priced lower, that is a margin decision to make explicitly.
 */
export type BillingTier = "pro" | "power";
/** Every cadence a subscription row may carry, including the capped founding
 *  price on Pro (see PRO_FOUNDING_PRICE). */
export type BillingCadence = "monthly" | "yearly" | "founding_yearly";
/** The ladder the pickers iterate. Founding is a price, not a rung: it is
 *  bought once, from the founding button, and never switched onto. */
export type StandardCadence = Exclude<BillingCadence, "founding_yearly">;
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
/** Spelled out where a sentence needs the currency, not the glyph. */
export const CURRENCY_NAME: Record<Currency, string> = {
  USD: "US dollars",
  INR: "Indian rupees",
};
export const CURRENCIES: readonly Currency[] = ["INR", "USD"];

/**
 * Where /pricing remembers a visitor's currency choice so it survives
 * navigation. A cookie rather than localStorage: the page resolves the initial
 * currency on the SERVER (the visitor's region, or this), and a preference only
 * the browser could read would make the first paint flip to the other currency.
 *
 * DISPLAY ONLY. It never reaches checkout — what a customer is charged is
 * decided by the processor that takes the money, never by anything the browser
 * remembers. See chargingProcessor in @/lib/billing/display-currency.
 */
export const CURRENCY_PREFERENCE_COOKIE = "dhaga-price-currency";

/** Narrows an untrusted cookie value. Anything else falls back to the
 *  region-derived default rather than being coerced into a currency. */
export function asCurrency(value: string | undefined): Currency | null {
  return CURRENCIES.find((currency) => currency === value) ?? null;
}

/** Render order for the pickers. Mirrors packages/ee's catalog, which decides
 *  which of these are actually for sale on an instance. */
export const BILLING_TIERS: readonly BillingTier[] = ["pro", "power"];
export const BILLING_CADENCES: readonly StandardCadence[] = ["monthly", "yearly"];

export const PRICES: Record<Currency, Record<BillingTier, Record<StandardCadence, DisplayPrice>>> = {
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

/**
 * Founding Pro — the first-500-seats price on Pro (BRD §8.4). Shown separately
 * from standard billing so it is never confused with the ongoing price.
 *
 * NOT a first-year teaser, and the name says so. A Razorpay Plan carries the
 * amount and charges it every cycle, so a founding subscription renews at
 * ₹6,999 rather than stepping up to the standard ₹8,499 — that is the decision
 * (BRD §11 Q6, resolved 2026-08), and it needs no dashboard change because it
 * is already what the Plan does. `createSubscription` in packages/ee opens the
 * mandate for a ten-year horizon of cycles (Razorpay has no "bill until
 * cancelled"), which is the one bound on "for as long as you stay subscribed".
 *
 * SOLD IN INR ONLY: the Razorpay plan (RAZORPAY_PLAN_PRO_FOUNDING_YEARLY,
 * ₹6,999 against ₹8,499) is the only one that exists, and packages/ee has no
 * Stripe price for it on purpose — a USD checkout would mint a seat the
 * Razorpay-side cap never sees. The USD figures stay as the equivalent quoted
 * on the USD marketing cards; nothing charges them.
 */
export const PRO_FOUNDING_PRICE: Record<Currency, DisplayPrice> = {
  USD: { amount: 79, perMonth: 7, originalAmount: 96 },
  INR: { amount: 6999, perMonth: 583, originalAmount: 8499 },
};

export const TIER_LABEL: Record<BillingTier, string> = { pro: "Pro", power: "Power" };

export const CADENCE_LABEL: Record<BillingCadence, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  // Keyed for EVERY cadence a row can hold, not just the two the picker shows:
  // the plan status line renders CADENCE_LABEL[current.cadence], so a missing
  // key would crash the settings page for exactly the customers who paid for
  // the founding seat.
  founding_yearly: "Founding yearly",
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
