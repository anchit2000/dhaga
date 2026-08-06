import { razorpayPlanId, type PlanSelection } from "../catalog";
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
 */
export async function createRazorpayCheckout(
  userId: string,
  selection: PlanSelection,
): Promise<RazorpayCheckoutHandoff> {
  const { keyId } = getRazorpayCredentials();
  const subscription = await createSubscription({
    planId: razorpayPlanId(selection.plan, selection.cadence),
    userId,
    tier: selection.plan,
  });
  return { subscriptionId: subscription.id, keyId };
}
