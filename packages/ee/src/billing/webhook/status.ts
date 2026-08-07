import type Stripe from "stripe";
import type { SubscriptionStatus } from "../../db/schema";
import { selectionForStripePriceId } from "../catalog";

export function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

/**
 * The tier the subscription is CURRENTLY billing, read off its price id.
 *
 * A scheduled downgrade lands as a `customer.subscription.updated` with a new
 * price and nothing else to signal it — no metadata, no checkout session. Left
 * unread, the row would keep saying `power` forever while Stripe charged for
 * Pro, so the whole scheduled-change path would grant the wrong entitlement.
 * Undefined for a price this instance no longer sells: better to leave the
 * stored tier alone than to demote someone on a lookup miss.
 */
export function billedTier(sub: Stripe.Subscription): "pro" | "power" | undefined {
  const priceId = sub.items.data[0]?.price.id;
  return (priceId ? selectionForStripePriceId(priceId)?.plan : undefined) ?? undefined;
}

/**
 * Maps Stripe's full subscription-status set onto the four statuses this app
 * stores. Entitlement (hasUnlimitedAi, billing/index.ts) is granted only for
 * `active`, so an entitlement-preserving status MUST land on `active` here:
 * `trialing` is a paying-intent, in-good-standing state and is stored as
 * `active` (this app has no separate trialing status). Only genuinely
 * delinquent or ended statuses reduce entitlements. The `Record` keyed on the
 * full Stripe union is exhaustive — a new Stripe status won't silently fall
 * through to a wrong default.
 *
 * It is also what decides pending-approval access on the Stripe path: the
 * webhook approves exactly when this resolves to `active`.
 */
export const STRIPE_STATUS_TO_STORED: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
  active: "active",
  trialing: "active", // entitlement-granting; stored as active (no separate trialing status)
  past_due: "past_due",
  unpaid: "past_due",
  paused: "past_due", // activated then suspended — not entitled, may resume
  incomplete: "incomplete",
  incomplete_expired: "canceled", // initial payment never completed — treat as ended
  canceled: "canceled",
};
