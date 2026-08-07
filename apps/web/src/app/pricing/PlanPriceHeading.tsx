"use client";

import { useDisplayCurrency } from "./currency-context";
import { priceForCadence } from "@/utils/constants/landing";
import { formatPrice } from "@/utils/constants/pricing";
import type { PricingPlan } from "@/types";
import type { ReactElement } from "react";

/**
 * The two price lines in a comparison-table column heading.
 *
 * A client island inside an otherwise server-rendered table: these are the only
 * cells in it that move with the currency toggle, and making the whole table a
 * client component would ship every comparison row to the browser to animate
 * six numbers.
 */
export function PlanPriceHeading({ plan }: { plan: PricingPlan }): ReactElement {
  const { currency } = useDisplayCurrency();
  const monthly = priceForCadence(plan, "monthly", currency);
  const yearly = priceForCadence(plan, "yearly", currency);

  return (
    <>
      <p className="mt-2 font-display text-2xl tabular-nums text-paper">
        {formatPrice(currency, monthly.monthly)}/mo
      </p>
      <p className="text-xs text-fog">
        {plan.priceTier ? `${formatPrice(currency, yearly.monthly)}/mo yearly` : "Forever"}
      </p>
    </>
  );
}
