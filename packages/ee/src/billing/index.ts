import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getSubscriptionForUser } from "./repo";
import { createCheckoutUrl, createPortalUrl } from "./checkout";
import { availableCombinations } from "./catalog";
import { getFoundingOffer } from "./founding";
import { getSaleOffers } from "./sale-offers";
import { stripeEnabled } from "./stripe-client";
import { razorpayEnabled } from "./razorpay";
import {
  cancelPlan,
  changePlan,
  planStateFromRow,
  reconcilePlanState,
  resumePlan,
  revertScheduledChange,
} from "./plan-change";
import type { SubscriptionRow } from "../db/schema";

/**
 * Pure entitlement predicate: a subscription grants unlimited AI only while it
 * is active, on a paid plan, and not past its expiry. `currentPeriodEnd` may be
 * set by Stripe (the paid renewal boundary) or by an admin (a manual comp that
 * should lapse) — either way, once it's in the past the entitlement is gone.
 * Split out from the DB read (and taking `now`) so the expiry logic is unit-
 * testable without a database.
 */
export function isUnlimitedAiSub(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.plan !== "pro" && sub.plan !== "power") return false;
  return sub.currentPeriodEnd === null || sub.currentPeriodEnd > now;
}

export async function hasUnlimitedAi(userId: string, db?: NodePgDatabase): Promise<boolean> {
  return isUnlimitedAiSub(await getSubscriptionForUser(userId, db));
}

/**
 * DB-ONLY. One indexed read on `subscriptions`, no Stripe/Razorpay call on any
 * path through here — and that property is load-bearing, not incidental.
 *
 * currentPlan / hasFeature / requireFeature (apps/web/src/lib/entitlements) sit
 * directly on top of this and run per MCP request, per AI action and per gated
 * control. While `current` was read live from the processor, every one of those
 * was a payment-API round-trip: latency on hot paths, rate-limit exposure, and
 * a processor outage degrading features that have nothing to do with payment.
 * Cadence and any booked change are now denormalised onto the row by the
 * webhooks (db/schema.ts), so this is pure catalog logic over our own data.
 * `reconcilePlan` is the one explicit place a processor is still asked.
 */
export async function getPlanSummary(userId: string) {
  // Hosted mode can run admin/early-access without billing (e.g. a free
  // beta) — no processor configured means no billing UI at all, not a broken
  // one. An instance may sell through either processor or both, so this asks
  // "is anything for sale here", not "is Stripe configured".
  const stripe = stripeEnabled();
  const razorpay = razorpayEnabled();
  if (!stripe && !razorpay) return null;
  const sub = await getSubscriptionForUser(userId);
  return {
    plan: (sub?.plan ?? "free") as "free" | "pro" | "power",
    status: sub?.status ?? null,
    hasStripeCustomer: Boolean(sub?.stripeCustomerId?.startsWith("cus_")),
    stripeEnabled: stripe,
    razorpayEnabled: razorpay,
    // Built from the row we just read. Null when nothing is live — a free
    // account, a cancelled one, or an admin comp — and the UI then falls back
    // to the buy path in `offers`.
    current: planStateFromRow(sub),
    // Only the (tier, cadence) pairs this instance has a configured price for.
    // A button whose price env var is missing would always error, so it is
    // never rendered — the UI offers exactly what can actually be bought.
    offers: {
      stripe: stripe ? availableCombinations("stripe") : [],
      razorpay: razorpay ? availableCombinations("razorpay") : [],
    },
  };
}

export const billingGate = {
  hasUnlimitedAi,
  getPlanSummary,
  /** Deliberately its own call rather than a field on getPlanSummary: that one
   *  runs per entitlement check and must stay a single indexed read. */
  getFoundingOffer,
  /** Config-only, and the one billing read a page with no signed-in user makes
   *  — see ./sale-offers for why /pricing needs it. */
  getSaleOffers,
  /** The billing settings page calls this before rendering, and nothing else
   *  does: it is the single deliberate processor round-trip on the read path. */
  reconcilePlan: reconcilePlanState,
  createCheckoutUrl,
  createPortalUrl,
  changePlan,
  cancelPlan,
  resumePlan,
  revertScheduledChange,
};

export { handleStripeWebhook } from "./webhook";
export {
  activeSubscriptionRef,
  classifyPlanChange,
  isTierDowngrade,
  planChangeOffers,
  planChangeTiming,
  planStateFromRow,
  reconcilePlanState,
  type CurrentPlanState,
  type PlanChangeDirection,
  type PlanChangeOffer,
  type PlanChangeResult,
  type PlanChangeTiming,
} from "./plan-change";
export {
  availableCombinations,
  parsePlanSelection,
  BILLING_CADENCES,
  BILLING_TIERS,
  FOUNDING_CADENCE,
  isFoundingSelection,
  type BillingCadence,
  type BillingTier,
  type PlanSelection,
} from "./catalog";
export {
  getFoundingOffer,
  FOUNDING_SEAT_CAP,
  FoundingSoldOutError,
  type FoundingOffer,
} from "./founding";
export {
  applyPaymentOutcome,
  findPaymentUserId,
  recordPayment,
  type PaymentOutcomeInput,
  type RecordPaymentInput,
} from "./payments";
export {
  confirmRazorpayPayment,
  createRazorpayCheckout,
  handleRazorpayWebhook,
  razorpayEnabled,
  type ConfirmFailure,
  type ConfirmInput,
  type ConfirmResult,
  type RazorpayCheckoutHandoff,
} from "./razorpay";
