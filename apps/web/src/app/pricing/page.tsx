import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { PricingPlanCard } from "@/components/landing/PricingPlanCard";
import { CREDIT_EXAMPLES, PRICING_PLANS } from "@/utils/constants/landing";
import { SITE_URL } from "@/utils/constants/site";
import { PlanComparison } from "./PlanComparison";
import { PricingFaq } from "./PricingFaq";
import { PricingStructuredData } from "./structured-data";
import type { Metadata } from "next";
import type { ReactElement } from "react";

const TITLE = "Pricing — Dhaga";
const DESCRIPTION =
  "Dhaga pricing: unlimited contacts, notes, and export free forever, plus 10 AI " +
  "credits a month; Pro at $8/mo billed yearly for 300 AI credits a month — " +
  "about 100 new people scanned, noted, and asked about; and a $79 founding " +
  "annual plan for the first 500 seats. Open source and self-hostable.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Dhaga",
    url: `${SITE_URL}/pricing`,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export default function PricingPage(): ReactElement {
  return (
    <main className="relative">
      <PricingStructuredData />
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-32 sm:pt-40">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Pricing
        </p>
        <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Dhaga pricing — one decision a year, not twelve.
        </h1>
        <p className="mt-5 max-w-2xl text-fog">
          Contacts, notes, facts, follow-ups, keyword search and export are
          unlimited and free, forever — and you can self-host the whole thing.
          The AI part runs on monthly credits: 10 free, 300 on Pro. One card
          scan is one credit.
        </p>
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <PricingPlanCard key={plan.tier} plan={plan} delay={i * 120} />
          ))}
        </div>
        <div className="mt-10 rounded-lg border border-seam bg-panel/50 p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-fog">
            What a credit buys
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-x-10">
            {CREDIT_EXAMPLES.map((example) => (
              <li
                key={example.price}
                className="flex items-baseline gap-3 text-sm text-fog"
              >
                <span className="w-[5.5rem] shrink-0 font-mono text-xs text-ember">
                  {example.price}
                </span>
                <span>{example.action}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-fog">
            Credits reset on the 1st and don&apos;t roll over. When a month runs
            out the app keeps working — notes and contacts still save, search
            falls back to keywords — and the AI resumes at the reset. There is
            no overage bill. A conference week is the honest exception: scanning
            and noting 150 badges spends a whole Pro month.
          </p>
        </div>
      </section>
      <PlanComparison />
      <PricingFaq />
      <FinalCta />
      <Footer />
    </main>
  );
}
