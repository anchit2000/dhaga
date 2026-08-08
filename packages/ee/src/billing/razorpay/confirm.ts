import type { SubscriptionPlan } from "../../db/schema";
import { selectionForRazorpayPlanId, tierForRazorpayPlanId } from "../catalog";
import { recordPayment } from "../payments";
import { upsertSubscription } from "../repo";
import { fetchSubscription } from "./client";
import { getRazorpayCredentials } from "./config";
import { isValidSubscriptionSignature } from "./verify";
import { RAZORPAY_STATUS_TO_STORED } from "./webhook";

export type ConfirmFailure = "signature" | "unpaid" | "wrong_user" | "wrong_plan";

export type ConfirmResult =
  | { ok: true; plan: SubscriptionPlan; active: boolean }
  | { ok: false; reason: ConfirmFailure };

export interface ConfirmInput {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}

/**
 * Records a completed Razorpay payment from the browser's checkout handler.
 *
 * The signature proves the browser isn't inventing a payment, but says nothing
 * about WHAT was bought — so every fact that decides the entitlement is
 * re-read from Razorpay rather than the request body: the owning user, the
 * tier, and the status.
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
  const cadence = selectionForRazorpayPlanId(subscription.planId)?.cadence ?? null;

  await upsertSubscription({
    userId,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    razorpaySubscriptionId: subscription.id,
    razorpayPaymentId: input.paymentId,
    plan: tier,
    status,
    // Null before the first charge lands; upsertSubscription preserves rather
    // than erases, since a null boundary reads as "never expires".
    currentPeriodEnd: subscription.currentEnd,
    cadence,
    scheduled: null, // a subscription being confirmed has nothing booked yet
  });
  // Ledger the charge with what this path actually knows — and only once
  // Razorpay says the subscription is `active`, which is the same "money has
  // moved" test the webhook grants approval on. An `authenticated` mandate has
  // no charge to record, and inventing one would put a payment that never
  // happened into the reconciliation.
  //
  // The amount is deliberately absent rather than invented: only the
  // `subscription.charged` webhook carries the payment entity, and it fills the
  // gap moments later through recordPayment's coalesce-on-conflict. Recording
  // here means a webhook that never arrives still leaves the charge on record.
  if (status === "active") {
    await recordPayment({
      userId,
      processor: "razorpay",
      processorPaymentId: input.paymentId,
      processorSubscriptionId: subscription.id,
      status: "captured",
      plan: tier,
      cadence,
      occurredAt: subscription.currentStart,
    });
  }
  // `authenticated` is a real, successful outcome: the mandate is approved but
  // the first charge hasn't settled. Say so rather than claiming the plan is
  // live — subscription.charged will flip it within moments.
  return { ok: true, plan: tier, active: status === "active" };
}
