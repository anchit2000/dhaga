import type { PaymentStatus } from "../../db/schema";
import { revokeApprovalForRazorpayPayment, revokeUserApproval } from "../../approval/repo";
import { selectionForRazorpayPlanId, tierForRazorpayPlanId } from "../catalog";
import { applyPaymentOutcome, recordPayment } from "../payments";
import type { Notes, PaymentEntity, SubscriptionEntity } from "./webhook-events";
import { userIdFrom } from "./webhook-events";

/**
 * Payment-ledger side of the Razorpay webhook. Split out of ./webhook per the
 * 150-line rule.
 */

/** The tier this subscription is CURRENTLY on, with `notes` only as a fallback.
 *  `notes` is stamped once at creation and never rewritten, so after a plan
 *  change it still names the original tier — trusting it would leave a customer
 *  who moved Power→Pro entitled to Power forever. */
export function tierFor(entity: SubscriptionEntity): "pro" | "power" {
  return (
    (entity.plan_id ? tierForRazorpayPlanId(entity.plan_id) : null) ??
    (entity.notes?.plan === "power" ? "power" : "pro")
  );
}

/**
 * Records the charge behind a `subscription.charged` event. The payment entity
 * rides alongside the subscription on that event and carries the money, which
 * is the only place this integration learns an amount on the recurring path.
 * No payment id means no charge to ledger — an activation with nothing charged.
 */
export async function ledgerCharge(
  userId: string,
  entity: SubscriptionEntity,
  payment: PaymentEntity | undefined,
): Promise<void> {
  if (!payment?.id) return;
  await recordPayment({
    userId,
    processor: "razorpay",
    processorPaymentId: payment.id,
    processorSubscriptionId: entity.id,
    // Razorpay reports paise. Integer minor units end to end — no conversion.
    amountMinor: typeof payment.amount === "number" ? payment.amount : null,
    currency: payment.currency?.toUpperCase() ?? null,
    status: "captured",
    plan: tierFor(entity),
    cadence: entity.plan_id ? (selectionForRazorpayPlanId(entity.plan_id)?.cadence ?? null) : null,
    occurredAt: entity.current_start ? new Date(entity.current_start * 1000) : null,
  });
}

/**
 * Money going back: move the ledger row and revoke the invite it bought.
 *
 * The LEDGER resolves the owner now. It used to be resolved from the payment's
 * `notes` — but Razorpay is not documented to copy a subscription's notes onto
 * the payments it raises for that subscription's charges, so that lookup was an
 * unverified guess with a single overwritten scalar behind it. A row per charge
 * answers it outright; notes and the stored scalar remain as fallbacks for
 * charges made before the ledger existed.
 */
export async function revokeForPayment(
  paymentId: string | null,
  notes: Notes,
  status: Extract<PaymentStatus, "refunded" | "partially_refunded" | "disputed">,
): Promise<void> {
  const ledgered = paymentId
    ? await applyPaymentOutcome({ processor: "razorpay", processorPaymentId: paymentId, status })
    : null;
  const userId = ledgered ?? userIdFrom(notes);
  if (userId) await revokeUserApproval(userId);
  else if (paymentId) await revokeApprovalForRazorpayPayment(paymentId);
}

/** Partial and full refunds are different facts, so they are different
 *  statuses. An unknown amount falls back to the conservative "refunded". */
export function refundOutcome(
  refundAmount: number | undefined,
  paymentAmount: number | undefined,
): Extract<PaymentStatus, "refunded" | "partially_refunded"> {
  return typeof refundAmount === "number" &&
    typeof paymentAmount === "number" &&
    refundAmount < paymentAmount
    ? "partially_refunded"
    : "refunded";
}
