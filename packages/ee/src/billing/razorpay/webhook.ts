import type { SubscriptionStatus } from "../../db/schema";
import { approveUser } from "../../approval/repo";
import { selectionForRazorpayPlanId } from "../catalog";
import { getSubscriptionForUser, upsertSubscription } from "../repo";
import { getRazorpayWebhookSecret } from "./config";
import { isValidWebhookSignature } from "./verify";
import type { RazorpayEvent } from "./webhook-events";
import { paymentIdFrom, userIdFrom } from "./webhook-events";
import { ledgerCharge, refundOutcome, revokeForPayment, tierFor } from "./webhook-ledger";

/**
 * Maps Razorpay's subscription-status set onto the four statuses this app
 * stores. Entitlement (hasUnlimitedAi, billing/index.ts) is granted only for
 * `active`, so an entitlement-preserving status MUST land on `active` here.
 *
 * The two that are easy to get wrong:
 *   - `authenticated` means the mandate is approved but no money has moved.
 *     That is NOT an entitlement — it maps to `incomplete`, or a user could
 *     approve a mandate, cancel, and keep Pro.
 *   - `completed` means the plan ran its full total_count, not that something
 *     failed. There is nothing left to charge, so the entitlement ends.
 *
 * Keyed exhaustively so a status Razorpay adds later fails loudly at the
 * lookup rather than silently defaulting to something generous.
 */
export const RAZORPAY_STATUS_TO_STORED: Record<string, SubscriptionStatus> = {
  created: "incomplete",
  authenticated: "incomplete", // mandate approved, nothing charged yet
  active: "active",
  pending: "past_due", // a charge failed; Razorpay is retrying
  halted: "past_due", // retries exhausted, may still be revived
  cancelled: "canceled",
  completed: "canceled", // ran to the end of total_count
  expired: "canceled",
};

/**
 * Verifies the Razorpay signature itself (this route has no session — the
 * signature IS the auth) and writes to the DB before returning, so retries on
 * a slow response don't race a "succeeded but not recorded" state.
 *
 * This is the reliable half of the integration. /api/razorpay/verify depends on
 * the buyer's browser surviving the redirect back; this does not, so a customer
 * who pays and immediately closes the tab still gets what they paid for. Every
 * handler is idempotent under redelivery: the subscription upsert is keyed on
 * userId, and the payment-ledger write on the UNIQUE processor_payment_id.
 *
 * It is also the ONLY Razorpay path that grants pending-approval access
 * ("payment is the invite" — see ../../approval). /api/razorpay/verify runs on
 * the buyer's browser right after the modal closes and deliberately does NOT
 * approve: the rule is "approval when the payment is confirmed by the
 * processor", and this is the only place that is true of. Refund and dispute
 * revoke; `subscription.cancelled` does not — they paid for the term.
 *
 * Split per the 150-line rule: ./webhook-events holds the payload shapes,
 * ./webhook-ledger the ledger writes and the refund→account resolution.
 */
export async function handleRazorpayWebhook(rawBody: string, signature: string): Promise<void> {
  if (!isValidWebhookSignature({ rawBody, signature, webhookSecret: getRazorpayWebhookSecret() })) {
    throw new Error("Invalid Razorpay webhook signature.");
  }
  const event = JSON.parse(rawBody) as RazorpayEvent;

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.pending":
    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed": {
      const entity = event.payload?.subscription?.entity;
      if (!entity) break;
      const userId = userIdFrom(entity.notes);
      const status = RAZORPAY_STATUS_TO_STORED[entity.status];
      // An unrecognised status is not an excuse to guess: skip rather than
      // grant or revoke on a value this code has never seen.
      if (!userId || !status) break;
      // The payment id stays on the subscription row for the pre-ledger refund
      // fallback; the ledger write below is what actually records the charge.
      // Only `subscription.charged` carries one, and the other events must not
      // blank it, hence the read-then-preserve.
      const chargedPaymentId = event.payload?.payment?.entity?.id ?? null;
      const existingPaymentId = chargedPaymentId
        ? null
        : ((await getSubscriptionForUser(userId))?.razorpayPaymentId ?? null);
      await upsertSubscription({
        userId,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        razorpaySubscriptionId: entity.id,
        razorpayPaymentId: chargedPaymentId ?? existingPaymentId,
        plan: tierFor(entity),
        status,
        // Null in the `created` state; upsertSubscription preserves rather than
        // erases, since a null boundary reads as "never expires".
        currentPeriodEnd: entity.current_end ? new Date(entity.current_end * 1000) : null,
        // Denormalised so no entitlement read ever has to ask Razorpay for it.
        cadence: entity.plan_id ? (selectionForRazorpayPlanId(entity.plan_id)?.cadence ?? null) : null,
        // A cleared flag means the booked change landed or was dropped. While it
        // is set we leave the stored target alone: naming the target plan needs
        // the separate pendingUpdate call, which the change-plan path and the
        // settings-page reconcile already make.
        ...(entity.has_scheduled_changes ? {} : { scheduled: null }),
      });
      if (status === "active") {
        await ledgerCharge(userId, entity, event.payload?.payment?.entity);
        await approveUser(userId);
      }
      break;
    }
    // Money going the other way. Razorpay sends the refunded/disputed PAYMENT
    // alongside the refund or dispute entity; either names the payment id the
    // ledger is keyed on.
    case "refund.created":
    case "refund.processed": {
      const payment = event.payload?.payment?.entity;
      await revokeForPayment(
        paymentIdFrom(event),
        payment?.notes,
        refundOutcome(event.payload?.refund?.entity?.amount, payment?.amount),
      );
      break;
    }
    case "payment.dispute.created":
    case "payment.dispute.lost": {
      await revokeForPayment(paymentIdFrom(event), event.payload?.payment?.entity?.notes, "disputed");
      break;
    }
    default:
      break;
  }
}
