"use client";

import Link from "next/link";
import { useState, type ReactElement } from "react";

import { PricingPlanCard } from "@/components/landing/PricingPlanCard";
import { Button } from "@/components/ui/button";
import styles from "./PricingCards.module.css";
import {
  FOUNDING_PRO_OFFER,
  PRICING_PLANS,
  type BillingCadence,
} from "@/utils/constants/landing";

export function PricingCards(): ReactElement {
  const [cadence, setCadence] = useState<BillingCadence>("yearly");

  return (
    <div className={styles.pricing}>
      <div
        className={`mt-10 inline-flex rounded-full border p-1 ${styles.toggle}`}
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
            delay={index * 120}
          />
        ))}
      </div>
      <aside className={`mt-6 flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${styles.founding}`}>
        <div>
          <p className="font-display text-xl">Founding Pro · ${FOUNDING_PRO_OFFER.price}/year</p>
          <p className="mt-1 text-sm text-fog">
            First {FOUNDING_PRO_OFFER.seats} seats save ${FOUNDING_PRO_OFFER.savings} against the standard ${FOUNDING_PRO_OFFER.standardYearlyPrice} annual price.
          </p>
        </div>
        <Button
          render={<Link href="#request-access" />}
          variant="link"
          className="min-h-11 justify-start px-0 text-ember"
        >
          Request a founding seat →
        </Button>
      </aside>
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
