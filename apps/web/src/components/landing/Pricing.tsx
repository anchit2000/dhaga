import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRICING_PLANS } from "@/utils/constants/landing";
import { Particles } from "./Particles";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";
import { SpotlightCard } from "./SpotlightCard";
import { TiltCard } from "./TiltCard";

export function Pricing() {
  return (
    <section className="relative overflow-hidden px-6 py-24" id="pricing">
      <div className="pointer-events-none absolute inset-0">
        <Particles
          particleColors={["#e2a44c", "#a49a8a"]}
          particleCount={10000}
          particleSpread={14}
          particleBaseSize={45}
          speed={0.12}
          cameraDistance={17}
          disableRotation
        />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Pricing"
          heading="Renew once a year. Not every month."
          intro="One annual plan, simple as that — no monthly meter running while you're not looking. The founding price locks in before public launch."
        />
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <Reveal key={plan.tier} delay={i * 120}>
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
                </SpotlightCard>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
