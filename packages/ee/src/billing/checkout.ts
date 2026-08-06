import { getStripe, priceIdFor } from "./stripe-client";
import { getSubscriptionForUser, getUserEmail } from "./repo";
import type { PlanSelection } from "./catalog";

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export async function createCheckoutUrl(userId: string, selection: PlanSelection): Promise<string> {
  const stripe = getStripe();
  const existing = await getSubscriptionForUser(userId);
  const email = existing ? undefined : ((await getUserEmail(userId)) ?? undefined);

  const session = await stripe.checkout.sessions.create({
    // Always recurring — every plan renews.
    mode: "subscription",
    line_items: [{ price: priceIdFor(selection), quantity: 1 }],
    client_reference_id: userId,
    // `plan` is the TIER the webhook will store. Carried in metadata rather
    // than re-derived from the price id, so adding a price never silently
    // grants the wrong tier.
    metadata: { userId, plan: selection.plan },
    // Null when the existing row came from Razorpay — that user has no Stripe
    // customer yet, so Checkout should create one rather than be handed a null.
    customer: existing?.stripeCustomerId ?? undefined,
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
  // A Razorpay-purchased plan has no Stripe customer, so there is no Stripe
  // portal to send them to. Razorpay's Orders API issues one-time payments
  // with nothing to cancel or renew, so this is a dead end by design rather
  // than a missing feature — fail with a sentence a user can act on.
  if (!existing.stripeCustomerId) {
    throw new Error("This plan was paid through Razorpay and has no Stripe billing portal.");
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: existing.stripeCustomerId,
    return_url: `${baseUrl()}/app/settings`,
  });
  return session.url;
}
