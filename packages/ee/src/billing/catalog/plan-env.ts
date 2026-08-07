import {
  ALL_BILLING_CADENCES,
  BILLING_CADENCES,
  BILLING_TIERS,
  FOUNDING_CADENCE,
  type BillingCadence,
  type BillingTier,
  type PlanSelection,
} from "./types";

/**
 * Env var names holding the processor's own price/plan identifier, one per
 * (tier, cadence). Amounts live in Stripe/Razorpay, never here: an id cannot be
 * fat-fingered into a wrong charge the way an integer can, and multi-currency
 * (Stripe Adaptive Pricing) only works if the amount is Stripe's to decide.
 *
 * STRIPE_PRICE_PRO_ANNUAL keeps its original name rather than being renamed to
 * _YEARLY — it is already set on live instances, and a rename would silently
 * disable Pro on deploy.
 *
 * The tables are PARTIAL per tier: a combination with no entry is one this app
 * cannot sell at all, which is different from one whose env var is simply
 * unset. Founding Pro exists only on Razorpay — it is an INR offer against an
 * INR plan, and giving Stripe a founding entry would let a USD checkout mint a
 * seat the Razorpay-side cap knows nothing about.
 */
type PlanEnvTable = Record<BillingTier, Partial<Record<BillingCadence, string>>>;

const STRIPE_PRICE_ENV: PlanEnvTable = {
  pro: { monthly: "STRIPE_PRICE_PRO_MONTHLY", yearly: "STRIPE_PRICE_PRO_ANNUAL" },
  power: { monthly: "STRIPE_PRICE_POWER_MONTHLY", yearly: "STRIPE_PRICE_POWER_ANNUAL" },
};

const RAZORPAY_PLAN_ENV: PlanEnvTable = {
  pro: {
    monthly: "RAZORPAY_PLAN_PRO_MONTHLY",
    yearly: "RAZORPAY_PLAN_PRO_YEARLY",
    [FOUNDING_CADENCE]: "RAZORPAY_PLAN_PRO_FOUNDING_YEARLY",
  },
  power: { monthly: "RAZORPAY_PLAN_POWER_MONTHLY", yearly: "RAZORPAY_PLAN_POWER_YEARLY" },
};

function read(name: string | undefined, tier: BillingTier, cadence: BillingCadence): string {
  const value = name ? process.env[name] : undefined;
  if (!value) throw new Error(`${tier}/${cadence} isn't for sale on this instance.`);
  return value;
}

export function stripePriceId(tier: BillingTier, cadence: BillingCadence): string {
  return read(STRIPE_PRICE_ENV[tier][cadence], tier, cadence);
}

export function razorpayPlanId(tier: BillingTier, cadence: BillingCadence): string {
  return read(RAZORPAY_PLAN_ENV[tier][cadence], tier, cadence);
}

/** True when the founding plan id is configured at all. The seat cap is a
 *  separate, DB-backed question — see ../founding. */
export function foundingPlanConfigured(): boolean {
  const name = RAZORPAY_PLAN_ENV.pro[FOUNDING_CADENCE];
  return Boolean(name && process.env[name]);
}

/**
 * Which (tier, cadence) combinations this instance can actually sell, per
 * processor. Drives the UI so a cadence with no configured price is never
 * offered — a button that always errors is worse than no button.
 *
 * STANDARD cadences only. Founding is a capped, first-purchase-only price, so
 * it must never arrive here: everything downstream treats this list as "things
 * anyone may buy or switch to at any time", and both halves of that are false
 * of a founding seat.
 */
export function availableCombinations(processor: "stripe" | "razorpay"): PlanSelection[] {
  const table = processor === "stripe" ? STRIPE_PRICE_ENV : RAZORPAY_PLAN_ENV;
  const out: PlanSelection[] = [];
  for (const tier of BILLING_TIERS) {
    for (const cadence of BILLING_CADENCES) {
      const name = table[tier][cadence];
      if (name && process.env[name]) out.push({ plan: tier, cadence });
    }
  }
  return out;
}

/**
 * Reverse lookup: which tier does this Razorpay plan id sell? Used at
 * verification time so the tier granted comes from the plan the customer
 * actually subscribed to, not from anything the browser said.
 *
 * The founding plan resolves to `pro`, because that is what it grants — it is a
 * price, not a tier.
 *
 * Returns null for an id this instance doesn't sell — including a real
 * Razorpay plan from the same account that isn't wired up here, which must not
 * grant anything.
 */
export function tierForRazorpayPlanId(planId: string): BillingTier | null {
  return lookup(RAZORPAY_PLAN_ENV, planId)?.plan ?? null;
}

/**
 * Reverse lookup for the FULL selection (tier AND cadence), per processor.
 *
 * The processor's price/plan object is the ORIGIN of a subscription's cadence,
 * and these two are what turn it back into a `PlanSelection`. It is no longer
 * the only place cadence lives: it is denormalised onto `subscriptions.cadence`
 * (db/schema.ts) so an entitlement check never has to make a processor call.
 * These lookups are what the webhooks and the settings-page reconcile use to
 * WRITE that column — they run where a processor payload is already in hand,
 * never on a read path. Null for an id this instance doesn't sell, same
 * fail-closed rule as tierForRazorpayPlanId.
 */
export function selectionForStripePriceId(priceId: string): PlanSelection | null {
  return lookup(STRIPE_PRICE_ENV, priceId);
}

export function selectionForRazorpayPlanId(planId: string): PlanSelection | null {
  return lookup(RAZORPAY_PLAN_ENV, planId);
}

function lookup(table: PlanEnvTable, id: string): PlanSelection | null {
  // An empty id must not match an unset env var (both read as falsy) — that
  // would resolve an unknown processor object to a real, paid selection.
  if (!id) return null;
  for (const tier of BILLING_TIERS) {
    // ALL cadences, not just the standard ladder: a founding subscriber's plan
    // id must still resolve, or their row would store no cadence at all.
    for (const cadence of ALL_BILLING_CADENCES) {
      const name = table[tier][cadence];
      if (name && process.env[name] === id) return { plan: tier, cadence };
    }
  }
  return null;
}
