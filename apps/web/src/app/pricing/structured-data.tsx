import {
  FOUNDING_PRO_OFFER,
  PRICING_FAQ_ITEMS,
  PRICING_PLANS,
} from "@/utils/constants/landing";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "@/utils/constants/site";
import type { ReactElement } from "react";

// Page-level JSON-LD for /pricing. The root layout already emits Organization
// and WebSite, so those are deliberately not repeated here — this adds only
// what the pricing page itself is evidence for: the priced offers and the
// pricing FAQ. Both payloads are derived from the same constants the page
// renders, so the markup can never claim a price the page doesn't show.
const PRICING_URL = `${SITE_URL}/pricing`;

const PRO = PRICING_PLANS.find((plan) => plan.tier === "Pro");
if (!PRO) throw new Error("Pro pricing must be configured");

export const PRICING_OFFERS = [
  {
    "@type": "Offer",
    name: "Free",
    price: 0,
    priceCurrency: "USD",
    url: `${SITE_URL}/signup`,
  },
  {
    "@type": "Offer",
    name: "Pro monthly",
    price: PRO.monthlyPrice,
    priceCurrency: "USD",
    description: "Billed monthly",
    url: `${PRICING_URL}#request-access`,
  },
  {
    "@type": "Offer",
    name: "Pro yearly",
    price: PRO.yearlyTotal,
    priceCurrency: "USD",
    description: `$${PRO.yearlyMonthlyPrice}/month, billed yearly`,
    url: `${PRICING_URL}#request-access`,
  },
  {
    "@type": "Offer",
    name: "Founding Pro — first year",
    price: FOUNDING_PRO_OFFER.price,
    priceCurrency: "USD",
    availability: "https://schema.org/LimitedAvailability",
    url: `${PRICING_URL}#request-access`,
  },
] as const;

const softwareApplicationLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  offers: PRICING_OFFERS,
};

const faqPageLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export function PricingStructuredData(): ReactElement {
  return (
    <>
      {/* Static, developer-authored payloads — no user input, safe to inline. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
      />
    </>
  );
}
