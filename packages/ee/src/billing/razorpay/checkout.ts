import { isFoundingSelection, razorpayPlanId, type PlanSelection } from "../catalog";
import { assertNoExistingSubscription } from "../checkout";
import { claimFoundingSeat, FoundingSoldOutError } from "../founding";
import { getSubscriptionForUser } from "../repo";
import { createSubscription } from "./client";
import { getRazorpayCredentials } from "./config";

/** What the browser needs to open the modal. Every plan is recurring, so this
 *  is always a Razorpay Subscription. */
export interface RazorpayCheckoutHandoff {
  subscriptionId: string;
  keyId: string;
}

/**
 * The caller passes a SELECTION, never a price. The amount and cadence live in
 * the Razorpay Plan, so the browser never gets to say what something costs.
 *
 * Refuses outright for an account that already has a live subscription — on
 * either processor. Razorpay will happily create a second mandate against the
 * same card, and the customer would then be charged twice a month with no sign
 * of it in our single-row-per-user table.
 *
 * THE ONLY place a founding seat is granted, and the only place the cap is
 * enforced. The browser's view of "N seats left" is a hint that may be minutes
 * stale; scarcity is decided here, against the database, before the Razorpay
 * subscription exists — so a seat can never be paid for and then found not to
 * exist. See ../founding for how the claim survives two buyers at seat 500.
 */
export async function createRazorpayCheckout(
  userId: string,
  selection: PlanSelection,
): Promise<RazorpayCheckoutHandoff> {
  assertNoExistingSubscription(await getSubscriptionForUser(userId));
  // Resolved BEFORE the seat is claimed: a selection this instance can't sell
  // (`power` with a founding cadence, say) must fail without burning a seat.
  const planId = razorpayPlanId(selection.plan, selection.cadence);
  if (isFoundingSelection(selection) && (await claimFoundingSeat(userId)) === null) {
    throw new FoundingSoldOutError();
  }
  const { keyId } = getRazorpayCredentials();
  const subscription = await createSubscription({ planId, userId, tier: selection.plan });
  return { subscriptionId: subscription.id, keyId };
}
