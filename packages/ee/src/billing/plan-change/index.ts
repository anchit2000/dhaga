import { getSubscriptionForUser, patchSubscriptionForUser } from "../repo";
import { requireActiveRef } from "./state";
import { cancelStripePlan, clearStripeScheduledChange, resumeStripePlan } from "./stripe";
import { cancelRazorpayPlan, clearRazorpayScheduledChange } from "./razorpay";

/**
 * The plan-change lifecycle for a user who ALREADY pays. Every entry point
 * starts from requireActiveRef and refuses to run without one, so the only way
 * to reach a processor from here is by modifying the subscription that exists —
 * see the guard in ../checkout.ts and ../razorpay/checkout.ts for the other
 * side of the same rule.
 *
 * Split per the 150-line rule: ./change holds the tier/cadence move itself
 * (the one that has to classify upgrade vs downgrade), this file the rest.
 */

/** Drops a booked change so the customer stays on what they have. */
export async function revertScheduledChange(userId: string): Promise<void> {
  const ref = requireActiveRef(await getSubscriptionForUser(userId));
  if (ref.processor === "stripe") await clearStripeScheduledChange(ref.subscriptionId);
  else await clearRazorpayScheduledChange(ref.subscriptionId);
  await patchSubscriptionForUser(userId, { scheduled: null, syncedAt: new Date() });
}

/**
 * Cancel at the renewal boundary on either processor. The flag is written here
 * rather than left to the webhook so the page reflects it on the next render;
 * the webhook rewrites the same value when it arrives.
 */
export async function cancelPlan(userId: string): Promise<Date | null> {
  const ref = requireActiveRef(await getSubscriptionForUser(userId));
  const endsAt =
    ref.processor === "stripe"
      ? await cancelStripePlan(ref.subscriptionId)
      : await cancelRazorpayPlan(ref.subscriptionId);
  // HAZARD: a null currentPeriodEnd means "never expires" to isUnlimitedAiSub
  // (it is how an unbounded admin comp is represented). Razorpay leaves
  // `current_end` null until the first cycle starts, so writing it through
  // unguarded would turn a cancellation into a permanent free pass. Only
  // narrow the boundary, never erase one we already have.
  await patchSubscriptionForUser(userId, {
    cancelAtPeriodEnd: true,
    ...(endsAt ? { currentPeriodEnd: endsAt } : {}),
    // Both processors release a booked change when the subscription is
    // cancelled, so the stored copy must stop advertising one too.
    scheduled: null,
    syncedAt: new Date(),
  });
  return endsAt;
}

/** Undo a pending cancellation. Stripe only — Razorpay has no resume API, so
 *  the confirmation dialog is the last chance to change your mind there. */
export async function resumePlan(userId: string): Promise<void> {
  const ref = requireActiveRef(await getSubscriptionForUser(userId));
  if (ref.processor !== "stripe") {
    throw new Error("A cancelled Razorpay subscription can't be resumed — start a new plan instead.");
  }
  await resumeStripePlan(ref.subscriptionId);
  await patchSubscriptionForUser(userId, { cancelAtPeriodEnd: false });
}

export { changePlan, type PlanChangeResult } from "./change";
export {
  activeSubscriptionRef,
  canChangeRazorpayPlan,
  classifyPlanChange,
  isTierDowngrade,
  planChangeOffers,
  planChangeTiming,
  TIER_RANK,
} from "./decide";
export {
  getCurrentPlanState,
  planStateFromRow,
  reconcilePlanState,
  type CurrentPlanState,
} from "./state";
export type {
  ActiveSubscriptionRef,
  BillingProcessor,
  PlanChangeDirection,
  PlanChangeOffer,
  PlanChangeTiming,
  ProcessorPlanState,
  ScheduledPlanChange,
} from "./types";
