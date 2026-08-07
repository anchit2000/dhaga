import { PRICES, type Currency } from "@/utils/constants/pricing";
import type { PricingPlan } from "@/types";

export type BillingCadence = "monthly" | "yearly";

export interface DisplayPrice {
  monthly: number;
  billedTotal: number;
  savings: number;
}

const FREE: DisplayPrice = { monthly: 0, billedTotal: 0, savings: 0 };

/**
 * What one card shows, in one currency. The amounts come from PRICES — the same
 * table the in-app plan picker quotes — rather than from fields on the plan, so
 * a card and a checkout cannot drift apart, and so the /pricing currency toggle
 * has something to switch.
 *
 * `savings` is against twelve months at the monthly rate, which is the claim
 * the "Save X a year" line makes; it is not PRICES' `originalAmount` (the same
 * number today, but that one is the crossed-out comparison price and is free to
 * change on its own).
 */
export function priceForCadence(
  plan: PricingPlan,
  cadence: BillingCadence,
  currency: Currency,
): DisplayPrice {
  if (!plan.priceTier) return FREE;
  const { monthly, yearly } = PRICES[currency][plan.priceTier];

  if (cadence === "monthly") {
    return { monthly: monthly.amount, billedTotal: monthly.amount, savings: 0 };
  }

  return {
    monthly: yearly.perMonth,
    billedTotal: yearly.amount,
    savings: monthly.amount * 12 - yearly.amount,
  };
}
