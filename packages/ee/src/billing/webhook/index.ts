import { getStripe } from "../stripe-client";
import {
  getSubscriptionByStripeSubscriptionId,
  updateSubscriptionStatusByStripeId,
  upsertSubscription,
} from "../repo";
import { approveUser } from "../../approval/repo";
import { STRIPE_STATUS_TO_STORED, billedTier, periodEnd } from "./status";
import { billedCadence, recordStripeCharge, refundStatus, revokeForCharge } from "./charges";

/**
 * Split per the 150-line rule: ./status holds the pure Stripe→stored mappings
 * (exhaustive status table, billed tier, period end), ./charges the payment
 * ledger writes and the refund→account resolution, this file the event
 * dispatch. Import path stays `./webhook`.
 */
export { STRIPE_STATUS_TO_STORED } from "./status";

/**
 * Verifies the Stripe signature itself (this route has no session — the
 * signature IS the auth) and writes to the DB before returning, so retries
 * from Stripe on a slow response don't race a "succeeded but not recorded"
 * state. Every handler is an idempotent upsert, safe for Stripe's at-least-
 * once delivery — the payment ledger's UNIQUE processor_payment_id is what
 * makes the charge writes idempotent in particular.
 *
 * This is also the ONLY Stripe path that grants pending-approval access
 * ("payment is the invite" — see ../../approval). Deliberately not checkout.ts
 * and not the success_url redirect: both fire before any money has moved, so a
 * user who opens Checkout and walks away would otherwise be let in for free.
 * The matching revocations are money-back events only — `charge.refunded` and
 * `charge.dispute.created`. `customer.subscription.deleted` is NOT one of
 * them: cancelling is not undoing, and the customer paid for the term.
 */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is required in hosted mode.");
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!userId || !customerId) break;

      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        // Tier comes from the metadata checkout.ts stamped on the session, so a
        // new price id can never be mistaken for Pro. Falls back to "pro" only
        // for sessions created before Power existed.
        const tier = session.metadata?.plan === "power" ? "power" : "pro";
        const status = STRIPE_STATUS_TO_STORED[sub.status];
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          plan: tier,
          status,
          currentPeriodEnd: periodEnd(sub),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          // Denormalised so no entitlement read ever has to ask Stripe for it.
          cadence: billedCadence(sub),
          scheduled: null, // a brand-new subscription has nothing booked
        });
        // `incomplete` means Checkout finished but the first charge hasn't
        // settled (3DS still pending, say). Not paid yet, so not approved yet —
        // customer.subscription.updated grants it the moment it turns active.
        if (status === "active") await approveUser(userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const status = STRIPE_STATUS_TO_STORED[sub.status];
      await updateSubscriptionStatusByStripeId(sub.id, status, {
        currentPeriodEnd: periodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        plan: billedTier(sub),
        cadence: billedCadence(sub),
        // `schedule` gone means the booked change landed or was released, so
        // the stored copy must stop advertising one. While it is still set we
        // leave the stored target alone: the event carries only the schedule's
        // id, and the change-plan path (which knows what it booked) and the
        // settings-page reconcile are the two places that write the target.
        ...(sub.schedule ? {} : { scheduled: null }),
      });
      // The row was just written by id, so this read resolves the owner without
      // trusting anything on the event. Covers the delayed first charge and a
      // past_due account recovering — both are "the money arrived".
      if (status === "active") {
        const row = await getSubscriptionByStripeSubscriptionId(sub.id);
        if (row) await approveUser(row.userId);
      }
      break;
    }
    case "charge.succeeded": {
      await recordStripeCharge(event.data.object, "captured");
      break;
    }
    case "charge.failed": {
      // Ledgered but with no entitlement effect: a failed charge is a fact the
      // reconciliation needs, and `invoice.payment_failed` already moves status.
      await recordStripeCharge(event.data.object, "failed");
      break;
    }
    case "charge.refunded": {
      // Fires for partial refunds too. Money went back either way, so the
      // invite it bought goes back with it.
      const charge = event.data.object;
      await revokeForCharge(charge, refundStatus(charge));
      break;
    }
    case "charge.dispute.created": {
      // The dispute object names a charge, not a customer, so the charge is
      // re-read to find one.
      const dispute = event.data.object;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
      if (!chargeId) break;
      await revokeForCharge(await stripe.charges.retrieve(chargeId), "disputed");
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await updateSubscriptionStatusByStripeId(sub.id, "canceled", { scheduled: null });
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : invoice.parent?.subscription_details?.subscription?.id;
      if (subId) await updateSubscriptionStatusByStripeId(subId, "past_due");
      break;
    }
    default:
      break;
  }
}
