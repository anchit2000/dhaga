import type { BillingCadence, BillingTier, PlanSelection } from "../catalog";

export type BillingProcessor = "stripe" | "razorpay";

/**
 * Which way the money moves. Tier dominates cadence: power/yearly → pro/monthly
 * is a downgrade even though two axes moved, because the thing the customer
 * pays for got smaller.
 */
export type PlanChangeDirection = "upgrade" | "downgrade" | "unchanged";

/**
 * `immediate` bills now and prorates. `period_end` leaves the customer on what
 * they already paid for until the renewal boundary, then switches — the only
 * safe answer for a downgrade, which would otherwise imply a refund.
 */
export type PlanChangeTiming = "immediate" | "period_end";

/** A change the current subscriber may make, pre-classified server-side so the
 *  client never re-implements the upgrade/downgrade rule. */
export interface PlanChangeOffer extends PlanSelection {
  direction: PlanChangeDirection;
  timing: PlanChangeTiming;
}

/** A change already booked at the processor but not yet in effect. */
export interface ScheduledPlanChange {
  plan: BillingTier;
  cadence: BillingCadence;
  /** When it lands. Null if the processor hasn't told us a date yet. */
  effectiveAt: Date | null;
}

/**
 * What the PROCESSOR says about the live subscription right now — the result of
 * an actual Stripe/Razorpay call, and therefore only ever produced on a write
 * path (a plan change) or the settings page's explicit reconcile. Read paths
 * use `CurrentPlanState` from ../plan-change/state, which is built from our own
 * denormalised row so that no entitlement check touches a payment API.
 */
export interface ProcessorPlanState {
  /** Null when the price/plan id on the subscription isn't one this instance
   *  sells any more (an old price kept alive for existing customers). */
  cadence: BillingCadence | null;
  renewsAt: Date | null;
  pending: ScheduledPlanChange | null;
}

/** The subscription object a plan change must MODIFY. Its existence is what
 *  forbids opening a second checkout. */
export interface ActiveSubscriptionRef {
  processor: BillingProcessor;
  subscriptionId: string;
}
