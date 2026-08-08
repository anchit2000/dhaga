import { cookies } from "next/headers";

import { FinalCta, Footer } from "@/components/landing/Closing";
import { Header } from "@/components/landing/Header";
import { CREDIT_EXAMPLES } from "@/utils/constants/landing";
import { chargingProcessor, currencyFor } from "@/lib/billing/display-currency";
import { preferredProcessor } from "@/lib/billing/processor";
import { getBillingGate } from "@/lib/hosted/gate";
import { CURRENCY_PREFERENCE_COOKIE, asCurrency } from "@/utils/constants/pricing";
import { SITE_URL } from "@/utils/constants/site";
import { DisplayCurrencyProvider } from "./currency-context";
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
  "with yearly billing, or claim one of the first 500 founding Pro seats.";

/**
 * PER-REQUEST, not ISR. It used to revalidate every five minutes, which was
 * enough while the only server state was whether founding seats remained. The
 * currency the page opens in is now derived from the visitor's own request —
 * `x-vercel-ip-country` via preferredProcessor, and the cookie their last visit
 * left — and neither survives being cached across visitors. The two reads it
 * costs are one indexed count and process.env; nothing here is expensive, and
 * the alternative (serving one region's currency to everyone) is a wrong page.
 */
export const dynamic = "force-dynamic";

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
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image.png"],
  },
};

export default async function PricingPage(): Promise<ReactElement> {
  const gate = await getBillingGate();
  const [founding, offers, preferred, jar] = await Promise.all([
    // Null unless this instance has the Razorpay founding plan configured AND
    // seats remain — then neither the card nor the schema.org offer is
    // rendered, and standard Pro stands alone.
    gate.getFoundingOffer(),
    gate.getSaleOffers(),
    preferredProcessor(),
    cookies(),
  ]);

  // What this instance will actually bill in — resolved exactly the way the
  // in-app plan picker resolves it, so the two surfaces cannot name different
  // currencies. Today that is INR for everyone: Razorpay is the only processor
  // with configured plans, so chargingProcessor falls through to it even for a
  // visitor whose region prefers Stripe.
  const charged = chargingProcessor(offers, preferred);
  const chargingCurrency = charged ? currencyFor(charged) : null;
  // What to OPEN in: last visit's choice, else the visitor's region. A US
  // visitor therefore sees dollars first even though rupees is what we charge
  // — and CurrencyToggle says so, in as many words, until they switch.
  const displayCurrency =
    asCurrency(jar.get(CURRENCY_PREFERENCE_COOKIE)?.value) ?? currencyFor(preferred);

  return (
    <main className={`relative ${styles.page}`}>
      <PricingStructuredData
        foundingAvailable={founding !== null}
        // The charging currency, never the displayed one — and USD when nothing
        // is for sale at all, which is what the cards fall back to quoting.
        charging={chargingCurrency ?? "USD"}
      />
      <Header />
      {/* Spans the cards AND the comparison table: both quote prices, and a
          page showing two currencies at once is worse than either. */}
      <DisplayCurrencyProvider initial={displayCurrency} charging={chargingCurrency}>
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
          <PricingCards founding={founding} />
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
      </DisplayCurrencyProvider>
      <PricingFaq />
      <FinalCta />
      <Footer />
    </main>
  );
}
