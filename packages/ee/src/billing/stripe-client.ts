import Stripe from "stripe";
import { stripePriceId, type PlanSelection } from "./catalog";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required in hosted mode.");
  stripe ??= new Stripe(key);
  return stripe;
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Resolves a buyer's selection to a Stripe Price id. Lifetime is a one-time
 * price with no cadence; the recurring tiers come from the (tier, cadence)
 * table in ./catalog.
 */
export function priceIdFor(selection: PlanSelection): string {
  if (selection.plan === "lifetime") {
    const id = process.env.STRIPE_PRICE_LIFETIME;
    if (!id) throw new Error("STRIPE_PRICE_LIFETIME is not set — Lifetime isn't for sale here.");
    return id;
  }
  return stripePriceId(selection.plan, selection.cadence);
}
