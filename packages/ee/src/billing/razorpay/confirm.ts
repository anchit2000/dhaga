import type { SubscriptionPlan } from "../../db/schema";
import { tierForRazorpayPlanId } from "../catalog";
import { upsertSubscription } from "../repo";
import { fetchOrder, fetchSubscription } from "./client";
import { getRazorpayCredentials, lifetimeAmountPaise } from "./config";
import { isValidPaymentSignature, isValidSubscriptionSignature } from "./verify";
import { RAZORPAY_STATUS_TO_STORED } from "./webhook";

export type ConfirmFailure =
  | "signature"
  | "unknown_order"
  | "unpaid"
  | "wrong_user"
  | "amount_mismatch"
  | "wrong_plan";

export type ConfirmResult =
  | { ok: true; plan: SubscriptionPlan; active: boolean }
  | { ok: false; reason: ConfirmFailure };

export interface ConfirmInput {
  paymentId: string;
  signature: string;
  orderId?: string;
  subscriptionId?: string;
}

/**
 * Records a completed Razorpay payment from the browser's checkout handler.
 *
 * The signature proves the browser isn't inventing a payment, but says nothing
 * about WHAT was bought — so every fact that decides the entitlement is
 * re-read from Razorpay rather than the request body: the owning user, the
 * tier, the status, and (for Lifetime) the amount.
 *
 * This is the FAST path, not the authoritative one. The webhook (./webhook.ts)
 * writes the same rows without depending on the buyer's browser surviving the
 * redirect. Both are idempotent upserts keyed on userId, so whichever lands
 * first is correct and the other is a no-op re-write.
 */
export async function confirmRazorpayPayment(
  userId: string,
  input: ConfirmInput,
): Promise<ConfirmResult> {
  const { keySecret } = getRazorpayCredentials();

  if (input.subscriptionId) {
    if (
      !isValidSubscriptionSignature({
        subscriptionId: input.subscriptionId,
        paymentId: input.paymentId,
        signature: input.signature,
        keySecret,
      })
    ) {
      return { ok: false, reason: "signature" };
    }
    const subscription = await fetchSubscription(input.subscriptionId);
    if (subscription.userId !== userId) return { ok: false, reason: "wrong_user" };
    // The tier comes from the plan the customer actually subscribed to. A real
    // Razorpay plan from the same account that this instance doesn't sell
    // resolves to null and grants nothing.
    const tier = tierForRazorpayPlanId(subscription.planId);
    if (!tier) return { ok: false, reason: "wrong_plan" };
    const status = RAZORPAY_STATUS_TO_STORED[subscription.status];
    if (!status) return { ok: false, reason: "unpaid" };

    await upsertSubscription({
      userId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      razorpaySubscriptionId: subscription.id,
      razorpayPaymentId: input.paymentId,
      plan: tier,
      status,
      currentPeriodEnd: subscription.currentEnd,
    });
    // `authenticated` is a real, successful outcome: the mandate is approved
    // but the first charge hasn't settled. Say so rather than claiming the
    // plan is live — subscription.charged will flip it within moments.
    return { ok: true, plan: tier, active: status === "active" };
  }

  if (!input.orderId) return { ok: false, reason: "unknown_order" };
  if (
    !isValidPaymentSignature({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
      keySecret,
    })
  ) {
    return { ok: false, reason: "signature" };
  }
  const order = await fetchOrder(input.orderId);
  if (order.plan !== "lifetime") return { ok: false, reason: "unknown_order" };
  if (order.status !== "paid") return { ok: false, reason: "unpaid" };
  if (order.userId !== userId) return { ok: false, reason: "wrong_user" };
  if (order.amountPaise !== lifetimeAmountPaise()) return { ok: false, reason: "amount_mismatch" };

  await upsertSubscription({
    userId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    razorpayOrderId: order.id,
    razorpayPaymentId: input.paymentId,
    plan: "lifetime",
    status: "active",
  });
  return { ok: true, plan: "lifetime", active: true };
}
