import { razorpayPlanId, selectionForRazorpayPlanId, type PlanSelection } from "../catalog";
import {
  cancelScheduledChanges,
  cancelSubscription,
  fetchPendingUpdate,
  fetchSubscription,
  updateSubscriptionPlan,
} from "../razorpay/client";
import { canChangeRazorpayPlan } from "./decide";
import type { PlanChangeTiming, ProcessorPlanState, ScheduledPlanChange } from "./types";

/**
 * Razorpay half of the plan-change lifecycle. Every path MODIFIES the existing
 * subscription; nothing here creates one.
 *
 * Symmetric with the Stripe half. Razorpay's Update Subscription API settles
 * the money either way — `schedule_change_at: "now"` invoices the difference on
 * an upgrade and REFUNDS it on a downgrade — so the timing rule is the shared
 * one in ./decide: upgrades now, downgrades at `cycle_end`, precisely to avoid
 * triggering that refund.
 */
/**
 * WHETHER a change is booked and WHEN it lands both come free on the main
 * subscription fetch (`has_scheduled_changes`, `change_scheduled_at`). The
 * pending-update endpoint is called only to learn WHICH plan it switches to,
 * which the subscription object does not carry — that is the difference
 * between "changes on 3 Mar" and "Power until 3 Mar, then Pro".
 *
 * Failure degrades to no pending line rather than propagating: a scheduled
 * change we can't describe must not take the whole plan surface (and its cancel
 * button) down with it.
 */
async function pendingFor(subscriptionId: string, effectiveAt: Date | null): Promise<ScheduledPlanChange | null> {
  try {
    const pending = await fetchPendingUpdate(subscriptionId);
    const selection = selectionForRazorpayPlanId(pending.planId);
    if (!selection) return null;
    return { ...selection, effectiveAt: effectiveAt ?? pending.changeScheduledAt ?? pending.currentEnd };
  } catch (error) {
    console.error("[billing] couldn't read the pending Razorpay plan change", error);
    return null;
  }
}

export async function describeRazorpayPlan(subscriptionId: string): Promise<ProcessorPlanState> {
  const sub = await fetchSubscription(subscriptionId);
  return {
    cadence: selectionForRazorpayPlanId(sub.planId)?.cadence ?? null,
    renewsAt: sub.currentEnd,
    // Only spend the extra round-trip when the subscription itself says there
    // is something to describe — this runs on every settings render.
    pending: sub.hasScheduledChanges
      ? await pendingFor(subscriptionId, sub.changeScheduledAt)
      : null,
  };
}

/**
 * Reports when the change lands (null for an immediate one), so the caller can
 * tell the customer a date rather than "soon".
 *
 * The state check is not defensive padding: Razorpay rejects an update for
 * anything outside `authenticated`/`active`, and a `halted` subscriber — stored
 * as `past_due` after failed retries — can reach this from the settings page.
 */
export async function changeRazorpayPlan(
  subscriptionId: string,
  selection: PlanSelection,
  timing: PlanChangeTiming,
): Promise<Date | null> {
  const live = await fetchSubscription(subscriptionId);
  if (!canChangeRazorpayPlan(live.status)) {
    throw new Error(
      "Your subscription is paused for a failed payment, so the plan can't be changed yet. Settle the outstanding charge first.",
    );
  }
  const updated = await updateSubscriptionPlan(
    subscriptionId,
    razorpayPlanId(selection.plan, selection.cadence),
    timing === "immediate" ? "now" : "cycle_end",
  );
  if (timing === "immediate") return null;
  return updated.changeScheduledAt ?? updated.currentEnd;
}

export async function clearRazorpayScheduledChange(subscriptionId: string): Promise<void> {
  await cancelScheduledChanges(subscriptionId);
}

/**
 * Cancel at cycle end. Razorpay has no resume for a cancelled subscription, so
 * unlike Stripe this is one-way once the request lands — the confirmation step
 * in the UI is the only undo.
 */
export async function cancelRazorpayPlan(subscriptionId: string): Promise<Date | null> {
  const cancelled = await cancelSubscription(subscriptionId);
  return cancelled.currentEnd;
}
