import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/utils/constants/landing";

export function Pricing() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24" id="pricing">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber">
        Pricing
      </p>
      <h2 className="mt-4 max-w-xl text-balance font-display text-4xl font-medium sm:text-5xl">
        Pay once, remember forever.
      </h2>
      <p className="mt-4 max-w-2xl text-fog">
        No subscription required to own your own memory. The lifetime tier
        exists because we resent renting our contacts back, too.
      </p>
      <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`flex flex-col rounded-lg border p-7 ${
              plan.highlight
                ? "border-amber bg-gradient-to-b from-amber/10 to-panel"
                : "border-seam bg-panel"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <p
                className={`font-mono text-xs uppercase tracking-[0.18em] ${
                  plan.highlight ? "text-amber" : "text-fog"
                }`}
              >
                {plan.tier}
              </p>
              {plan.badge ? (
                <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-[10px] font-medium text-amber">
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
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-fog">
                  <span className="text-amber">·</span>
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
          </div>
        ))}
      </div>
    </section>
  );
}
