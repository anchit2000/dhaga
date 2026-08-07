import type { SubscriptionRow } from "../../db/schema";
import type { BillingCadence, BillingTier, PlanSelection } from "../catalog";
import type {
  ActiveSubscriptionRef,
  PlanChangeDirection,
  PlanChangeOffer,
  PlanChangeTiming,
} from "./types";

/**
 * Pure decision logic for the plan-change lifecycle. No DB, no network, no
 * processor SDK — everything here is a function of values, so the rules that
 * decide whether a customer is charged today can be tested exhaustively.
 */

/** Ordering of everything a user can be on, `free` included so the admin
 *  comp path shares one definition of "lower tier" with the buyer path. */
export const TIER_RANK: Record<"free" | BillingTier, number> = { free: 0, pro: 1, power: 2 };

/**
 * Yearly outranks monthly: dropping to monthly shortens what has been paid
 * for, so it is a reduction and must wait for the renewal boundary.
 *
 * `founding_yearly` ranks EQUAL to `yearly`, and that equality is the whole
 * protection for a founding member. It makes founding → standard yearly
 * classify as "unchanged", so the settings page never offers it (planChangeOffers
 * drops unchanged rows) and a posted request is a no-op instead of a silent
 * ₹1,500-a-year price rise applied "immediately, prorated". They are the same
 * rung of the ladder — one of them is just cheaper.
 */
const CADENCE_RANK: Record<BillingCadence, number> = {
  monthly: 0,
  yearly: 1,
  founding_yearly: 1,
};

/**
 * Tier first, cadence only as a tie-break. A tier drop is a downgrade whatever
 * the cadence does, because the alternative — calling power/yearly →
 * pro/monthly an "upgrade" on some blended score — would apply it immediately
 * and hand the customer a prorated refund for the year they already paid.
 */
export function classifyPlanChange(
  current: PlanSelection,
  target: PlanSelection,
): PlanChangeDirection {
  if (TIER_RANK[target.plan] !== TIER_RANK[current.plan]) {
    return TIER_RANK[target.plan] > TIER_RANK[current.plan] ? "upgrade" : "downgrade";
  }
  if (CADENCE_RANK[target.cadence] === CADENCE_RANK[current.cadence]) return "unchanged";
  return CADENCE_RANK[target.cadence] > CADENCE_RANK[current.cadence] ? "upgrade" : "downgrade";
}

/**
 * One rule for both processors, because both settle the difference the same
 * way: Stripe prorates an in-place item change, and Razorpay's Update
 * Subscription API with `schedule_change_at: "now"` raises an invoice for the
 * difference on an upgrade — and REFUNDS it on a downgrade. That refund is
 * exactly the liability we don't want, so a downgrade is deferred on both:
 * `end_date` on the Stripe schedule phase, `schedule_change_at: "cycle_end"`
 * on Razorpay.
 */
export function planChangeTiming(direction: PlanChangeDirection): PlanChangeTiming {
  return direction === "upgrade" ? "immediate" : "period_end";
}

/**
 * Razorpay only accepts an update for a subscription in `authenticated` or
 * `active` state — `created`, `pending` and `halted` are rejected by the API.
 * A halted subscriber (payment retries exhausted) is a real case that reaches
 * the settings page, so it needs a sentence they can act on rather than a raw
 * processor error.
 */
export function canChangeRazorpayPlan(liveStatus: string): boolean {
  return liveStatus === "active" || liveStatus === "authenticated";
}

/**
 * The single guard against double-billing: if this returns a ref, the user
 * already has a subscription object at a processor and any plan change must
 * MODIFY it. Opening a second Checkout would leave two live subscriptions
 * charging one customer, and neither processor deduplicates for us.
 *
 * `canceled` is the only status with nothing left to modify. `incomplete`
 * deliberately counts as live: on Razorpay it means an approved mandate
 * (`authenticated`) that will start charging on its own.
 *
 * A row with no processor subscription id — an admin comp, whose sentinel
 * customer id has a null subscription id — returns null: there is nothing at a
 * processor to duplicate, so that user may genuinely check out.
 */
export function activeSubscriptionRef(sub: SubscriptionRow | null): ActiveSubscriptionRef | null {
  if (!sub || sub.status === "canceled") return null;
  if (sub.stripeSubscriptionId) {
    return { processor: "stripe", subscriptionId: sub.stripeSubscriptionId };
  }
  if (sub.razorpaySubscriptionId) {
    return { processor: "razorpay", subscriptionId: sub.razorpaySubscriptionId };
  }
  return null;
}

/**
 * Every combination this instance sells, minus the one already in effect,
 * each pre-classified. Computed server-side so the settings UI renders "takes
 * effect immediately" vs "starts at renewal" from one implementation of the
 * rule instead of a client-side copy that can drift from what actually runs.
 */
export function planChangeOffers(
  current: PlanSelection,
  available: readonly PlanSelection[],
): PlanChangeOffer[] {
  return available.flatMap((target) => {
    const direction = classifyPlanChange(current, target);
    if (direction === "unchanged") return [];
    return [{ ...target, direction, timing: planChangeTiming(direction) }];
  });
}

/**
 * True when `next` sits below `current` in TIER_RANK. Used by the admin comp
 * path, which may raise a tier but never lower one.
 */
export function isTierDowngrade(
  current: "free" | BillingTier,
  next: "free" | BillingTier,
): boolean {
  return TIER_RANK[next] < TIER_RANK[current];
}
