import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { SpotlightCard } from "./SpotlightCard";
import { TiltCard } from "./TiltCard";
import type { PricingPlan } from "@/types";
import type { ReactElement } from "react";

/**
 * One plan card. Shared by the landing `Pricing` section and the standalone
 * /pricing route so the two surfaces can never drift apart. The CTA targets
 * the `#request-access` anchor, which both surfaces render (`FinalCta`).
 */
export function PricingPlanCard({
  plan,
  delay = 0,
}: {
  plan: PricingPlan;
  delay?: number;
}): ReactElement {
  return (
    <Reveal delay={delay}>
      <TiltCard>
        <SpotlightCard
          idleGlow={plan.highlight}
          className={`flex h-full flex-col rounded-lg border p-7 transition-all duration-300 hover:-translate-y-1 ${
            plan.highlight
              ? "border-amber bg-gradient-to-b from-amber/10 to-panel hover:shadow-[0_20px_60px_-20px_rgba(226,164,76,0.45)]"
              : "border-seam bg-panel hover:border-amber/40 hover:shadow-[0_20px_60px_-24px_rgba(226,164,76,0.3)]"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <p
              className={`font-mono text-xs uppercase tracking-[0.18em] ${
                plan.highlight ? "text-ember" : "text-fog"
              }`}
            >
              {plan.tier}
            </p>
            {plan.badge ? (
              <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-[10px] font-medium text-ember">
                {plan.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-5 font-display text-5xl tabular-nums">
            {plan.strikePrice ? (
              <span className="mr-2 align-middle font-sans text-xl text-fog line-through">
                {plan.strikePrice}
              </span>
            ) : null}
            {plan.price}
          </p>
          <p className="mt-1 text-sm text-fog">{plan.per}</p>
          {plan.suits ? (
            <p className="mt-5 border-t border-seam pt-5 text-sm text-paper">
              {plan.suits}
            </p>
          ) : null}
          <ul className="mt-6 flex-1 space-y-2.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-sm text-fog">
                <span className="text-ember">·</span>
                {feature}
              </li>
            ))}
          </ul>
          <Button
            render={<Link href="#request-access" />}
            variant={plan.highlight ? "default" : "outline"}
            className="mt-7"
          >
            {plan.cta}
          </Button>
        </SpotlightCard>
      </TiltCard>
    </Reveal>
  );
}
