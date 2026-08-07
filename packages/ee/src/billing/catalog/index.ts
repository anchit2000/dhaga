import type { SubscriptionPlan } from "../../db/schema";
import { ALL_BILLING_CADENCES, type BillingCadence, type PlanSelection } from "./types";

/**
 * What this instance sells and what a processor object grants. Split per the
 * 150-line rule — the import path `../catalog` is unchanged: ./types holds the
 * tier/cadence vocabulary, ./plan-env the env-var tables and the lookups
 * between our selections and Stripe/Razorpay ids.
 */
export {
  ALL_BILLING_CADENCES,
  BILLING_CADENCES,
  BILLING_TIERS,
  FOUNDING_CADENCE,
  isFoundingSelection,
  type BillingCadence,
  type BillingTier,
  type PlanSelection,
} from "./types";
export {
  availableCombinations,
  foundingPlanConfigured,
  razorpayPlanId,
  selectionForRazorpayPlanId,
  selectionForStripePriceId,
  stripePriceId,
  tierForRazorpayPlanId,
} from "./plan-env";

/** The tier column of the subscription row. Cadence is persisted too, but in
 *  its own column — see the denormalisation note in db/schema.ts. */
export function storedPlanFor(selection: PlanSelection): SubscriptionPlan {
  return selection.plan;
}

/**
 * Parses an untrusted `{ plan, cadence }` body. Returns null rather than
 * throwing so routes answer 400, and requires an explicit cadence rather than
 * defaulting to one the buyer never chose.
 *
 * `founding_yearly` parses like any other cadence — a shape check is not an
 * authorisation. Whether it may actually be BOUGHT is decided server-side by
 * the seat cap in ../founding (checkout) and refused outright by changePlan;
 * neither of those decisions belongs in a body parser.
 */
export function parsePlanSelection(input: unknown): PlanSelection | null {
  const body = input as { plan?: unknown; cadence?: unknown } | null;
  const plan = body?.plan;
  if (plan !== "pro" && plan !== "power") return null;
  const cadence = ALL_BILLING_CADENCES.find((known) => known === body?.cadence);
  if (!cadence) return null;
  return { plan, cadence };
}

/** `cadence` columns are plain text; anything that isn't a cadence this app
 *  knows reads as "unresolved" rather than being coerced into one, for the same
 *  fail-closed reason as the catalog lookups. */
export function asCadence(value: string | null): BillingCadence | null {
  return ALL_BILLING_CADENCES.find((cadence) => cadence === value) ?? null;
}
