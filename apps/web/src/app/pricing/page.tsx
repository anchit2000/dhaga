import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { CREDIT_EXAMPLES } from "@/utils/constants/landing";
import { SITE_URL } from "@/utils/constants/site";
import { PlanComparison } from "./PlanComparison";
import { PricingCards } from "./PricingCards";
import { PricingFaq } from "./PricingFaq";
import { PricingStructuredData } from "./structured-data";
import styles from "./PricingPage.module.css";
import type { Metadata } from "next";
import type { ReactElement } from "react";

const TITLE = "Pricing — Dhaga";
const DESCRIPTION =
  "Dhaga pricing: Free forever; Pro at $10 monthly or $8/mo billed yearly; " +
  "and Power at $30 monthly or $24/mo billed yearly, coming soon. Save 20% " +
  "with yearly billing, or request a $79 founding Pro seat.";

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
    <main className={`relative ${styles.page}`}>
      <PricingStructuredData />
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-32 sm:pt-40">
        <p className={`font-mono text-xs uppercase tracking-[0.22em] ${styles.eyebrow}`}>
          Pricing
        </p>
        <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Simple monthly pricing. A better deal yearly.
        </h1>
        <p className="mt-5 max-w-2xl text-fog">
          Contacts, notes, facts, follow-ups, keyword search and export are
          unlimited and free, forever — and you can self-host the whole thing.
          The AI part runs on monthly credits: 10 free, 300 on Pro, and 1,000
          on the coming-soon Power plan. One card scan is one credit.
        </p>
        <PricingCards />
        <div className={`mt-10 rounded-lg border p-6 sm:p-8 ${styles.creditPanel}`}>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-fog">
            What a credit buys
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-x-10">
            {CREDIT_EXAMPLES.map((example) => (
              <li
                key={example.price}
                className="flex items-baseline gap-3 text-sm text-fog"
              >
                <span className={`w-[5.5rem] shrink-0 font-mono text-xs ${styles.creditPrice}`}>
                  {example.price}
                </span>
                <span>{example.action}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-2xl text-sm text-fog">
            <span className={`font-mono text-xs ${styles.creditPrice}`}>
              0 credits
            </span>{" "}
            — goals and address-book noise filtering, on every plan. Write what
            you&apos;re working on in plain words — &ldquo;reach out to
            VCs&rdquo; — and Dhaga picks that cohort out of your own graph,
            surfaces a few each day, and burns the list down as you reach out.
            It also judges which imported address-book rows are people worth a
            message, so the plumber and the ride-hail support line stay out of
            your daily suggestions — never suggested, always findable: still in
            People, still searchable, still in every export, with one tap to
            overrule. Both run on the nightly batch sweep, throttled by how many
            contacts a night it looks at rather than billed.
          </p>
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
