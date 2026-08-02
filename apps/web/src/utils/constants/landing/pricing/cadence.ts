import type { PricingPlan } from "@/types";

export type BillingCadence = "monthly" | "yearly";

export interface DisplayPrice {
  monthly: number;
  billedTotal: number;
  savings: number;
}

export function priceForCadence(
  plan: PricingPlan,
  cadence: BillingCadence,
): DisplayPrice {
  if (cadence === "monthly") {
    return { monthly: plan.monthlyPrice, billedTotal: plan.monthlyPrice, savings: 0 };
  }

  return {
    monthly: plan.yearlyMonthlyPrice,
    billedTotal: plan.yearlyTotal,
    savings: plan.monthlyPrice * 12 - plan.yearlyTotal,
  };
}
