"use client";

import { useState, type ReactElement } from "react";

import { PricingPlanCard } from "@/components/landing/PricingPlanCard";
import { Button } from "@/components/ui/button";
import styles from "./PricingCards.module.css";
import { CurrencyToggle } from "./CurrencyToggle";
import { FoundingAside } from "./FoundingAside";
import { useDisplayCurrency } from "./currency-context";
import { PRICING_PLANS, type BillingCadence } from "@/utils/constants/landing";
import type { FoundingOffer } from "@/lib/hosted/gate";

/**
 * `founding` comes from the billing gate on the server. Null — unconfigured, no
 * Razorpay, or the seats gone — means the aside is not rendered at all and the
 * three standard cards stand alone, the same rule availableCombinations already
 * applies to a price with no configured id.
 *
 * Currency comes from the provider above, not a prop: the comparison table
 * further down the page quotes the same prices and has to move with this.
 */
export function PricingCards({
  founding,
}: {
  founding?: FoundingOffer | null;
}): ReactElement {
  const [cadence, setCadence] = useState<BillingCadence>("yearly");
  const { currency } = useDisplayCurrency();

  return (
    <div className={styles.pricing}>
      <CurrencyToggle />
      <div
        className={`mt-6 inline-flex rounded-full border p-1 ${styles.toggle}`}
        role="group"
        aria-label="Billing cadence"
      >
        <CadenceButton cadence="monthly" selected={cadence} onSelect={setCadence}>
          Monthly
        </CadenceButton>
        <CadenceButton cadence="yearly" selected={cadence} onSelect={setCadence}>
          Yearly · save 20%
        </CadenceButton>
      </div>
      <div className="mt-8 grid items-stretch gap-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan, index) => (
          <PricingPlanCard
            key={plan.tier}
            plan={plan}
            cadence={cadence}
            currency={currency}
            delay={index * 120}
          />
        ))}
      </div>
      {founding ? <FoundingAside offer={founding} /> : null}
    </div>
  );
}

function CadenceButton({
  cadence,
  selected,
  onSelect,
  children,
}: {
  cadence: BillingCadence;
  selected: BillingCadence;
  onSelect: (cadence: BillingCadence) => void;
  children: React.ReactNode;
}): ReactElement {
  const active = cadence === selected;
  return (
    <Button
      aria-pressed={active}
      onClick={() => onSelect(cadence)}
      variant="ghost"
      className={`min-h-11 px-5 text-sm ${active ? styles.activeToggle : ""}`}
    >
      {children}
    </Button>
  );
}
