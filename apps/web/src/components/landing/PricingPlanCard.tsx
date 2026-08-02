import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { SpotlightCard } from "./SpotlightCard";
import { TiltCard } from "./TiltCard";
import styles from "./PricingPlanCard.module.css";
import { priceForCadence, type BillingCadence } from "@/utils/constants/landing";
import type { PricingPlan } from "@/types";
import type { ReactElement } from "react";

/**
 * One plan card. Shared by the landing `Pricing` section and the standalone
 * /pricing route so the two surfaces can never drift apart. The CTA targets
 * the `#request-access` anchor, which both surfaces render (`FinalCta`).
 */
export function PricingPlanCard({
  plan,
  cadence = "yearly",
  delay = 0,
}: {
  plan: PricingPlan;
  cadence?: BillingCadence;
  delay?: number;
}): ReactElement {
  const price = priceForCadence(plan, cadence);
  const isFree = plan.monthlyPrice === 0;
  const isPower = plan.tier === "Power";
  const isPro = plan.tier === "Pro";

  return (
    <Reveal delay={delay}>
      <TiltCard>
        <SpotlightCard
          idleGlow={false}
          className={`flex h-full flex-col rounded-lg border p-7 transition-all duration-300 hover:-translate-y-1 ${styles.card} ${isPro ? styles.proCard : ""} ${isPower ? styles.powerCard : ""}`}
        >
          <div className="flex items-baseline justify-between">
            <p
              className={`font-mono text-xs uppercase tracking-[0.18em] ${
                isPower ? styles.powerText : isPro ? styles.trustText : "text-fog"
              }`}
            >
              {plan.tier}
            </p>
            {plan.badge ? (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${isPower ? styles.powerBadge : styles.trustBadge}`}>
                {plan.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-5 font-display text-5xl tabular-nums">
            ${price.monthly}
            {!isFree ? <span className="font-sans text-base text-fog">/mo</span> : null}
          </p>
          <p className="mt-1 min-h-5 text-sm text-fog">
            {isFree
              ? "Free forever"
              : cadence === "yearly"
                ? `$${price.billedTotal} billed yearly`
                : "Billed monthly"}
          </p>
          {price.savings > 0 ? (
            <p className={`mt-2 text-sm font-medium ${styles.trustText}`}>
              Save ${price.savings} a year
            </p>
          ) : null}
          {plan.suits ? (
            <p className="mt-5 border-t border-seam pt-5 text-sm text-paper">
              {plan.suits}
            </p>
          ) : null}
          <ul className="mt-6 flex-1 space-y-2.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm text-fog">
                <span className={isPower ? styles.powerText : styles.trustText}>·</span>
                {feature}
              </li>
            ))}
          </ul>
          <Button
            render={<Link href={plan.ctaHref} />}
            variant={plan.highlight ? "default" : "outline"}
            className={`mt-7 ${isPower ? styles.powerButton : ""}`}
          >
            {plan.cta}
          </Button>
        </SpotlightCard>
      </TiltCard>
    </Reveal>
  );
}
