import { getStripe, priceIdFor } from "./stripe-client";
import { getSubscriptionForUser, getUserEmail } from "./repo";
import { activeSubscriptionRef } from "./plan-change";
import type { PlanSelection } from "./catalog";

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/**
 * Checkout mints a NEW subscription, so it must never run for someone who
 * already has one — two live subscriptions bill one customer twice and neither
 * processor deduplicates for us. An existing subscriber changes plan through
 * changePlan() (./plan-change), which modifies the subscription in place.
 *
 * Throws rather than silently redirecting to the change flow: a caller that
 * reaches here with a live subscription has a bug, and the loudest place to
 * find it is before the charge.
 */
export function assertNoExistingSubscription(
  sub: Awaited<ReturnType<typeof getSubscriptionForUser>>,
): void {
  if (activeSubscriptionRef(sub)) {
    throw new Error("This account already has a subscription — change the plan instead of buying a second one.");
  }
}

/**
 * Only a real Stripe customer id may be handed to Stripe. An admin comp row
 * carries the `admin-granted:<userId>` sentinel in the same column (see
 * admin/subscription-admin/set-subscription.ts), and passing that through would
 * fail the API call for a user who is simply upgrading off a comp.
 */
function stripeCustomerId(sub: { stripeCustomerId: string | null } | null): string | undefined {
  return sub?.stripeCustomerId?.startsWith("cus_") ? sub.stripeCustomerId : undefined;
}

export async function createCheckoutUrl(userId: string, selection: PlanSelection): Promise<string> {
  const stripe = getStripe();
  const existing = await getSubscriptionForUser(userId);
  assertNoExistingSubscription(existing);
  const customer = stripeCustomerId(existing);
  const email = customer ? undefined : ((await getUserEmail(userId)) ?? undefined);

  const session = await stripe.checkout.sessions.create({
    // Always recurring — every plan renews.
    mode: "subscription",
    line_items: [{ price: priceIdFor(selection), quantity: 1 }],
    client_reference_id: userId,
    // `plan` is the TIER the webhook will store. Carried in metadata rather
    // than re-derived from the price id, so adding a price never silently
    // grants the wrong tier.
    metadata: { userId, plan: selection.plan },
    // Undefined when the existing row came from Razorpay or an admin comp —
    // that user has no Stripe customer yet, so Checkout should create one.
    customer,
    customer_email: email,
    success_url: `${baseUrl()}/app/settings?checkout=success`,
    cancel_url: `${baseUrl()}/app/settings?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalUrl(userId: string): Promise<string> {
  const stripe = getStripe();
  const existing = await getSubscriptionForUser(userId);
  if (!existing) throw new Error("No billing account yet.");
  // A Razorpay-purchased plan (and an admin comp) has no Stripe customer, so
  // there is no Stripe portal to send them to. That is no longer a dead end:
  // plan changes and cancel-at-cycle-end run against Razorpay's own
  // subscription API from the settings page (./plan-change/razorpay.ts). The
  // portal is a Stripe-only extra (invoices, card details).
  const customer = stripeCustomerId(existing);
  if (!customer) {
    throw new Error("This plan wasn't paid through Stripe, so it has no Stripe billing portal.");
  }
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${baseUrl()}/app/settings`,
  });
  return session.url;
}
