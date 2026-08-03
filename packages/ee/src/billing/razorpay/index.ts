import { randomUUID } from "node:crypto";
import type { SubscriptionPlan } from "../../db/schema";
import { upsertSubscription } from "../repo";
import { createOrder, fetchOrder } from "./client";
import { amountPaiseFor, getRazorpayCredentials, PRO_TERM_DAYS, razorpayEnabled } from "./config";
import { isValidPaymentSignature } from "./verify";

export { razorpayEnabled } from "./config";
export { isValidPaymentSignature } from "./verify";

export interface RazorpayOrderForCheckout {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

/** Razorpay caps `receipt` at 40 characters. */
function receiptFor(plan: SubscriptionPlan): string {
  return `dhaga_${plan}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/**
 * Amount comes from the plan via amountPaiseFor — the caller passes a plan,
 * never a price. The returned keyId is the publishable half, safe to hand the
 * browser so it can open the modal without a second round trip.
 */
export async function createRazorpayOrder(
  userId: string,
  plan: SubscriptionPlan,
): Promise<RazorpayOrderForCheckout> {
  const { keyId } = getRazorpayCredentials();
  const amountPaise = amountPaiseFor(plan);
  const order = await createOrder({ amountPaise, receipt: receiptFor(plan), userId, plan });
  return { orderId: order.id, amountPaise: order.amountPaise, currency: order.currency, keyId };
}

export type ConfirmFailure = "signature" | "unknown_order" | "unpaid" | "wrong_user" | "amount_mismatch";

export type ConfirmResult =
  | { ok: true; plan: SubscriptionPlan }
  | { ok: false; reason: ConfirmFailure };

/**
 * Grants the entitlement for a completed Razorpay payment.
 *
 * The signature proves the browser isn't inventing a payment, but it says
 * nothing about WHAT was bought — so every fact that decides the entitlement is
 * re-read from Razorpay's copy of the order rather than the request body:
 *   - `plan` from the order's notes, so a Lifetime-priced order can't claim Pro
 *   - `userId` from the same notes, checked against the session, so a payment
 *     can't be replayed onto another account
 *   - `status === "paid"`, so a merely-created order grants nothing
 *   - the amount, against what we'd charge today, so a stale cheap order
 *     can't be redeemed after a price rise
 *
 * Pro is a PREPAID TERM, not a mandate: the Orders API takes a single payment
 * and Razorpay will not auto-renew it. currentPeriodEnd is set PRO_TERM_DAYS
 * out and isUnlimitedAiSub (billing/index.ts) expires the entitlement there,
 * so the term lapses correctly on its own — but nothing charges the customer
 * again. Recurring INR billing needs the Razorpay Subscriptions API.
 */
export async function confirmRazorpayPayment(
  userId: string,
  input: { orderId: string; paymentId: string; signature: string },
): Promise<ConfirmResult> {
  const { keySecret } = getRazorpayCredentials();
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
  if (order.plan !== "pro" && order.plan !== "lifetime") return { ok: false, reason: "unknown_order" };
  const plan: SubscriptionPlan = order.plan;
  if (order.status !== "paid") return { ok: false, reason: "unpaid" };
  if (order.userId !== userId) return { ok: false, reason: "wrong_user" };
  if (order.amountPaise !== amountPaiseFor(plan)) return { ok: false, reason: "amount_mismatch" };

  await upsertSubscription({
    userId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    razorpayOrderId: order.id,
    razorpayPaymentId: input.paymentId,
    plan,
    status: "active",
    currentPeriodEnd:
      plan === "pro" ? new Date(Date.now() + PRO_TERM_DAYS * 24 * 60 * 60 * 1000) : null,
  });
  return { ok: true, plan };
}
