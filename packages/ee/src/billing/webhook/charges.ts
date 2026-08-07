import type Stripe from "stripe";
import { applyPaymentOutcome, recordPayment } from "../payments";
import { getSubscriptionByStripeCustomerId } from "../repo";
import { selectionForStripePriceId, type BillingCadence } from "../catalog";
import { revokeApprovalForStripeCustomer, revokeUserApproval } from "../../approval/repo";
import type { PaymentStatus } from "../../db/schema";

/**
 * The Stripe half of the payment ledger. A `charge` is the unit: it is what a
 * refund and a dispute both name, so keying the ledger on the charge id makes
 * "which account does this refund belong to" a lookup instead of a guess.
 */

function customerIdOf(charge: Stripe.Charge): string | null {
  if (!charge.customer) return null;
  return typeof charge.customer === "string" ? charge.customer : charge.customer.id;
}

/** Partial refunds are common (a prorated downgrade, a goodwill credit) and the
 *  two cases are not the same fact, so they are not the same status. */
export function refundStatus(charge: Stripe.Charge): Extract<
  PaymentStatus,
  "refunded" | "partially_refunded"
> {
  return charge.amount_refunded > 0 && charge.amount_refunded < charge.amount
    ? "partially_refunded"
    : "refunded";
}

/**
 * Writes one charge into the ledger.
 *
 * The owner comes from the subscription row the checkout webhook already
 * created, never from anything on the event. When there is no such row the
 * charge is skipped rather than stored against a guessed account: an
 * unattributable ledger row is worse than a missing one, since the whole point
 * is reconciliation. (Only reachable if `charge.succeeded` beats
 * `checkout.session.completed`, which Stripe does not normally do.)
 *
 * Logged without PII and without the payload — just the fact and the charge id,
 * which is the handle to find it in the Stripe dashboard.
 */
export async function recordStripeCharge(
  charge: Stripe.Charge,
  status: PaymentStatus,
): Promise<void> {
  const customerId = customerIdOf(charge);
  const sub = customerId ? await getSubscriptionByStripeCustomerId(customerId) : null;
  if (!sub) {
    console.warn(`[billing] stripe charge ${charge.id} has no known subscription — not ledgered`);
    return;
  }
  await recordPayment({
    userId: sub.userId,
    processor: "stripe",
    processorPaymentId: charge.id,
    processorSubscriptionId: sub.stripeSubscriptionId,
    // Stripe reports minor units already (cents). No conversion, no rounding.
    amountMinor: charge.amount,
    currency: charge.currency?.toUpperCase() ?? null,
    status,
    plan: sub.plan === "power" ? "power" : "pro",
    cadence: sub.cadence === "monthly" || sub.cadence === "yearly" ? sub.cadence : null,
    occurredAt: new Date(charge.created * 1000),
  });
}

/**
 * Money going back out: move the ledger row, then revoke the invite it bought.
 *
 * The ledger is the authoritative answer to "whose charge was this" — one row
 * per charge, carrying its owner — so a refund resolves directly instead of
 * being traced back through the customer. The customer lookup stays as the
 * fallback for charges made before the ledger existed: only the single latest
 * Razorpay payment was backfilled, so no historic Stripe charge is in there.
 */
export async function revokeForCharge(
  charge: Stripe.Charge,
  status: Extract<PaymentStatus, "refunded" | "partially_refunded" | "disputed">,
): Promise<void> {
  const userId = await applyPaymentOutcome({
    processor: "stripe",
    processorPaymentId: charge.id,
    status,
  });
  if (userId) {
    await revokeUserApproval(userId);
    return;
  }
  const customerId = customerIdOf(charge);
  if (customerId) await revokeApprovalForStripeCustomer(customerId);
}

/** The cadence the subscription is CURRENTLY billing, read off its price id —
 *  the sibling of billedTier in ./status, and what makes the denormalised
 *  `subscriptions.cadence` follow a scheduled change when it lands. */
export function billedCadence(sub: Stripe.Subscription): BillingCadence | null {
  const priceId = sub.items.data[0]?.price.id;
  return (priceId ? selectionForStripePriceId(priceId)?.cadence : null) ?? null;
}
