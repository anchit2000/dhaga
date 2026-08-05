import { randomUUID } from "node:crypto";
import { razorpayPlanId, type PlanSelection } from "../catalog";
import { createOrder, createSubscription } from "./client";
import { getRazorpayCredentials, lifetimeAmountPaise } from "./config";

/**
 * What the browser needs to open the modal. Recurring tiers ride the
 * Subscriptions API (Razorpay re-charges on its own); Lifetime rides the
 * Orders API, because a single payment with nothing to renew is exactly what
 * the Subscriptions API cannot express.
 */
export type RazorpayCheckoutHandoff =
  | { mode: "subscription"; subscriptionId: string; keyId: string }
  | { mode: "order"; orderId: string; amountPaise: number; currency: string; keyId: string };

/** Razorpay caps `receipt` at 40 characters. */
function receiptFor(plan: string): string {
  return `dhaga_${plan}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * The caller passes a SELECTION, never a price. A recurring tier's amount and
 * cadence live in the Razorpay Plan; Lifetime's amount lives in env. Either
 * way the browser never gets to say what something costs.
 */
export async function createRazorpayCheckout(
  userId: string,
  selection: PlanSelection,
): Promise<RazorpayCheckoutHandoff> {
  const { keyId } = getRazorpayCredentials();
  if (selection.plan !== "lifetime") {
    const subscription = await createSubscription({
      planId: razorpayPlanId(selection.plan, selection.cadence),
      userId,
      tier: selection.plan,
    });
    return { mode: "subscription", subscriptionId: subscription.id, keyId };
  }
  const order = await createOrder({
    amountPaise: lifetimeAmountPaise(),
    receipt: receiptFor("lifetime"),
    userId,
    plan: "lifetime",
  });
  return {
    mode: "order",
    orderId: order.id,
    amountPaise: order.amountPaise,
    currency: order.currency,
    keyId,
  };
}
