import { isFoundingSelection, type PlanSelection } from "../catalog";
import { getSubscriptionForUser, patchSubscriptionForUser } from "../repo";
import { classifyPlanChange, planChangeTiming } from "./decide";
import { currentSelection, describePlan, requireActiveRef } from "./state";
import { changeStripePlan } from "./stripe";
import { changeRazorpayPlan } from "./razorpay";
import type { PlanChangeTiming } from "./types";

export interface PlanChangeResult {
  changed: boolean;
  timing: PlanChangeTiming;
  /** Null for an immediate change (it already happened) or when the processor
   *  didn't give a date. */
  effectiveAt: Date | null;
}

/**
 * Moves an existing subscriber to another (tier, cadence). Never opens a
 * checkout: if the account has no live subscription this throws rather than
 * quietly creating a second one that would bill alongside the first.
 *
 * This reads the plan LIVE from the processor, and deliberately still does even
 * though the read paths no longer do. The classification decides whether the
 * customer is charged today or at renewal, so it must be made against what the
 * processor is actually about to bill — not a denormalised copy that a missed
 * webhook could have left one cycle stale. It is a user-initiated mutation, one
 * click, one round-trip; the hot entitlement paths are the ones that had to stop
 * paying that cost (see ./state).
 */
export async function changePlan(
  userId: string,
  selection: PlanSelection,
): Promise<PlanChangeResult> {
  // Founding Pro is a first-purchase price with a hard seat cap, and this path
  // has no cap to check — it just points an existing subscription at a plan id.
  // Without this, any subscriber could post `founding_yearly` and switch onto
  // the discount after the seats were gone. availableCombinations already keeps
  // it out of the offers list; this is the guard for a hand-made request.
  if (isFoundingSelection(selection)) {
    throw new Error("The founding price is only available when you first subscribe.");
  }
  const sub = await getSubscriptionForUser(userId);
  const ref = requireActiveRef(sub);
  const state = await describePlan(ref);
  const current = currentSelection(sub, state);
  if (!current) {
    // Without the current cadence there is no way to tell an upgrade from a
    // downgrade, and guessing decides whether money moves today.
    throw new Error("Couldn't read your current plan from the payment processor. Please try again.");
  }
  const direction = classifyPlanChange(current, selection);
  const timing = planChangeTiming(direction);
  if (direction === "unchanged") return { changed: false, timing, effectiveAt: null };

  let scheduledAt: Date | null = null;
  if (ref.processor === "stripe") {
    await changeStripePlan(ref.subscriptionId, selection, timing);
  } else {
    scheduledAt = await changeRazorpayPlan(ref.subscriptionId, selection, timing);
  }

  // An immediate change is already billed, so reflect the tier now instead of
  // waiting for the processor's webhook — the user is looking at the page. A
  // scheduled one must NOT touch the stored tier: they keep what they paid for
  // until the webhook says the new plan actually took over.
  //
  // Either way the denormalised plan state is written HERE too, from the change
  // this call just booked. Not a guess and not a second source of truth: we know
  // exactly what the processor was asked for and that it succeeded, so the page
  // re-renders right without another round-trip and the webhook rewrites the
  // same values when it lands.
  const effectiveAt = scheduledAt ?? state.renewsAt;
  if (timing === "immediate") {
    await patchSubscriptionForUser(userId, {
      plan: selection.plan,
      cancelAtPeriodEnd: false,
      cadence: selection.cadence,
      scheduled: null, // the processor released any booked change to apply this
      syncedAt: new Date(),
    });
    return { changed: true, timing, effectiveAt: null };
  }
  await patchSubscriptionForUser(userId, {
    // The cadence they are on until it lands is the one just read live.
    cadence: state.cadence,
    scheduled: { plan: selection.plan, cadence: selection.cadence, changeAt: effectiveAt },
    syncedAt: new Date(),
  });
  return { changed: true, timing, effectiveAt };
}
