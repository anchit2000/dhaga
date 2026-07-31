import Link from "next/link";
import { PRICING_PLANS } from "@/utils/constants/landing";
import { ParticlesLazy } from "./Particles/Lazy";
import { PricingPlanCard } from "./PricingPlanCard";
import { SectionHeading } from "./SectionHeading";

export function Pricing() {
  return (
    <section className="relative overflow-hidden px-6 py-24" id="pricing">
      <div className="pointer-events-none absolute inset-0">
        <ParticlesLazy
          particleColors={["--brand-amber", "--brand-fog"]}
          particleCount={2500}
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
          intro="One annual plan, simple as that. Contacts, notes and export are unlimited and free; the AI runs on a monthly credit allowance, so there's never an overage bill. The founding price locks in before public launch."
        />
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <PricingPlanCard key={plan.tier} plan={plan} delay={i * 120} />
          ))}
        </div>
        <p className="mt-8 text-sm">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center text-ember underline-offset-4 transition-colors hover:underline"
          >
            Compare plans in detail →
          </Link>
        </p>
      </div>
    </section>
  );
}
