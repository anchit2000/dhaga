import Stripe from "stripe";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required in hosted mode.");
  stripe ??= new Stripe(key);
  return stripe;
}

export function priceIdFor(plan: "pro" | "lifetime"): string {
  const id =
    plan === "lifetime"
      ? process.env.STRIPE_PRICE_LIFETIME
      : process.env.STRIPE_PRICE_PRO_ANNUAL;
  if (!id) throw new Error(`Missing Stripe price env var for plan "${plan}".`);
  return id;
}
