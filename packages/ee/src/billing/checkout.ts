import { getStripe, priceIdFor } from "./stripe-client";
import { getSubscriptionForUser, getUserEmail } from "./repo";

function baseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

export async function createCheckoutUrl(userId: string, plan: "pro" | "lifetime"): Promise<string> {
  const stripe = getStripe();
  const existing = await getSubscriptionForUser(userId);
  const email = existing ? undefined : ((await getUserEmail(userId)) ?? undefined);

  const session = await stripe.checkout.sessions.create({
    mode: plan === "lifetime" ? "payment" : "subscription",
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    client_reference_id: userId,
    metadata: { userId, plan },
    customer: existing?.stripeCustomerId,
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
  const session = await stripe.billingPortal.sessions.create({
    customer: existing.stripeCustomerId,
    return_url: `${baseUrl()}/app/settings`,
  });
  return session.url;
}
