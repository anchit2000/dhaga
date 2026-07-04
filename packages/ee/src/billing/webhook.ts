import type Stripe from "stripe";
import { getStripe } from "./stripe-client";
import { updateSubscriptionStatusByStripeId, upsertSubscription } from "./repo";

function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

/**
 * Verifies the Stripe signature itself (this route has no session — the
 * signature IS the auth) and writes to the DB before returning, so retries
 * from Stripe on a slow response don't race a "succeeded but not recorded"
 * state. Every handler is an idempotent upsert, safe for Stripe's at-least-
 * once delivery.
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

      if (session.mode === "payment") {
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          plan: "lifetime",
          status: "active",
        });
      } else if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          plan: "pro",
          status: sub.status === "active" ? "active" : "incomplete",
          currentPeriodEnd: periodEnd(sub),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      await updateSubscriptionStatusByStripeId(sub.id, sub.status === "active" ? "active" : "past_due", {
        currentPeriodEnd: periodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await updateSubscriptionStatusByStripeId(sub.id, "canceled");
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
