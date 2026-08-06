import type { SubscriptionPlan } from "../db/schema";

export type BillingTier = "pro" | "power";
export type BillingCadence = "monthly" | "yearly";

/**
 * What the buyer picked. Every plan is recurring, so a cadence is always
 * required — there is no one-time purchase to special-case.
 */
export interface PlanSelection {
  plan: BillingTier;
  cadence: BillingCadence;
}

export const BILLING_TIERS: readonly BillingTier[] = ["pro", "power"];
export const BILLING_CADENCES: readonly BillingCadence[] = ["monthly", "yearly"];

/**
 * Env var names holding the processor's own price/plan identifier, one per
 * (tier, cadence). Amounts live in Stripe/Razorpay, never here: an id cannot be
 * fat-fingered into a wrong charge the way an integer can, and multi-currency
 * (Stripe Adaptive Pricing) only works if the amount is Stripe's to decide.
 *
 * STRIPE_PRICE_PRO_ANNUAL keeps its original name rather than being renamed to
 * _YEARLY — it is already set on live instances, and a rename would silently
 * disable Pro on deploy.
 */
const STRIPE_PRICE_ENV: Record<BillingTier, Record<BillingCadence, string>> = {
  pro: { monthly: "STRIPE_PRICE_PRO_MONTHLY", yearly: "STRIPE_PRICE_PRO_ANNUAL" },
  power: { monthly: "STRIPE_PRICE_POWER_MONTHLY", yearly: "STRIPE_PRICE_POWER_ANNUAL" },
};

const RAZORPAY_PLAN_ENV: Record<BillingTier, Record<BillingCadence, string>> = {
  pro: { monthly: "RAZORPAY_PLAN_PRO_MONTHLY", yearly: "RAZORPAY_PLAN_PRO_YEARLY" },
  power: { monthly: "RAZORPAY_PLAN_POWER_MONTHLY", yearly: "RAZORPAY_PLAN_POWER_YEARLY" },
};

function read(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — that plan/cadence isn't for sale on this instance.`);
  return value;
}

export function stripePriceId(tier: BillingTier, cadence: BillingCadence): string {
  return read(STRIPE_PRICE_ENV[tier][cadence]);
}

export function razorpayPlanId(tier: BillingTier, cadence: BillingCadence): string {
  return read(RAZORPAY_PLAN_ENV[tier][cadence]);
}

/**
 * Which (tier, cadence) combinations this instance can actually sell, per
 * processor. Drives the UI so a cadence with no configured price is never
 * offered — a button that always errors is worse than no button.
 *
 */
export function availableCombinations(processor: "stripe" | "razorpay"): PlanSelection[] {
  const table = processor === "stripe" ? STRIPE_PRICE_ENV : RAZORPAY_PLAN_ENV;
  const out: PlanSelection[] = [];
  for (const tier of BILLING_TIERS) {
    for (const cadence of BILLING_CADENCES) {
      if (process.env[table[tier][cadence]]) out.push({ plan: tier, cadence });
    }
  }
  return out;
}

/**
 * Reverse lookup: which tier does this Razorpay plan id sell? Used at
 * verification time so the tier granted comes from the plan the customer
 * actually subscribed to, not from anything the browser said.
 *
 * Returns null for an id this instance doesn't sell — including a real
 * Razorpay plan from the same account that isn't wired up here, which must not
 * grant anything.
 */
export function tierForRazorpayPlanId(planId: string): BillingTier | null {
  for (const tier of BILLING_TIERS) {
    for (const cadence of BILLING_CADENCES) {
      if (process.env[RAZORPAY_PLAN_ENV[tier][cadence]] === planId) return tier;
    }
  }
  return null;
}

/** The tier stored on the subscription row — cadence is not persisted. */
export function storedPlanFor(selection: PlanSelection): SubscriptionPlan {
  return selection.plan;
}

/**
 * Parses an untrusted `{ plan, cadence }` body. Returns null rather than
 * throwing so routes answer 400, and requires an explicit cadence rather than
 * defaulting to one the buyer never chose.
 */
export function parsePlanSelection(input: unknown): PlanSelection | null {
  const body = input as { plan?: unknown; cadence?: unknown } | null;
  const plan = body?.plan;
  if (plan !== "pro" && plan !== "power") return null;
  const cadence = body?.cadence;
  if (cadence !== "monthly" && cadence !== "yearly") return null;
  return { plan, cadence };
}
