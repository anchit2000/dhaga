"use server";

import { redirect } from "next/navigation";
import { requireUserIdAllowingPending } from "@/lib/auth/guard";
import { getBillingGate, type PlanOffer } from "@/lib/hosted/gate";

/**
 * Stripe checkout, startable by an account that is still waiting for approval.
 *
 * Deliberately its own action rather than lib/actions/billing's
 * createCheckoutSessionAction: that one goes through requireUserId, which now
 * refuses unapproved accounts, and it must keep refusing them — this is the one
 * narrow hole ("let them pay"), so it is written where the hole is, not opened
 * in the guard every other action shares.
 *
 * Starting checkout grants nothing. Approval happens in the Stripe webhook,
 * when the payment is confirmed (packages/ee/src/billing/webhook) — abandoning
 * this Checkout leaves the account exactly as pending as it was.
 */
export async function startPendingCheckoutAction(formData: FormData): Promise<void> {
  const userId = await requireUserIdAllowingPending();
  const selection: PlanOffer = {
    plan: formData.get("plan") === "power" ? "power" : "pro",
    cadence: formData.get("cadence") === "monthly" ? "monthly" : "yearly",
  };
  const url = await (await getBillingGate()).createCheckoutUrl(userId, selection);
  redirect(url);
}
