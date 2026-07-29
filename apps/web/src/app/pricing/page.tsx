import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { PricingPlanCard } from "@/components/landing/PricingPlanCard";
import { getCurrentUser } from "@/lib/auth/guard";
import { PRICING_PLANS } from "@/utils/constants/landing";
import { SITE_URL } from "@/utils/constants/site";
import { PlanComparison } from "./PlanComparison";
import { PricingFaq } from "./PricingFaq";
import { PricingStructuredData } from "./structured-data";
import type { Metadata } from "next";
import type { ReactElement } from "react";

const TITLE = "Pricing — Dhaga";
const DESCRIPTION =
  "Dhaga pricing: a free tier with unlimited capture, notes, and the full CRM " +
  "used manually; Pro at $8/mo billed yearly for cloud AI with no monthly cap; " +
  "and a $79 founding annual plan for the first 500 seats. Open source and " +
  "self-hostable, with export at any time.";

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

export default async function PricingPage(): Promise<ReactElement> {
  const user = await getCurrentUser();

  return (
    <main className="relative">
      <PricingStructuredData />
      <Header isSignedIn={!!user} />
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-32 sm:pt-40">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          Pricing
        </p>
        <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Dhaga pricing — one decision a year, not twelve.
        </h1>
        <p className="mt-5 max-w-2xl text-fog">
          Unlimited capture, notes, and the full CRM are free forever, and you
          can self-host the whole thing. Cloud AI — card reads, note
          extraction, natural-language search, drafts, and briefs — is the paid
          part, and it has no monthly cap once you&apos;re on it.
        </p>
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <PricingPlanCard key={plan.tier} plan={plan} delay={i * 120} />
          ))}
        </div>
      </section>
      <PlanComparison />
      <PricingFaq />
      <FinalCta />
      <Footer />
    </main>
  );
}
