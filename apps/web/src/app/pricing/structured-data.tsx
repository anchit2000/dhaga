import { FOUNDING_PRO_OFFER, PRICING_FAQ_ITEMS } from "@/utils/constants/landing";
import { PRICES, formatPrice, type Currency } from "@/utils/constants/pricing";
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

/**
 * The offers, given whether Founding Pro is still on sale and which currency
 * this instance CHARGES in.
 *
 * A FUNCTION rather than a constant because both are server state. Availability
 * first: the founding entry claims `LimitedAvailability`, and a page that keeps
 * publishing that after the 500th seat is claimed is advertising something
 * nobody can buy. When the gate says no — unconfigured, no Razorpay, or sold
 * out — the offer is omitted entirely rather than downgraded to SoldOut,
 * matching the page, which stops rendering the card.
 *
 * And the currency is the CHARGING one, never the one the visitor toggled to.
 * The toggle switches an approximate conversion for comparison; a crawler
 * cannot see that caveat, so publishing `$96 USD` while Razorpay bills ₹8,499
 * would be a machine-readable false price — worse than no markup at all.
 * Founding Pro is INR whatever else is, because rupees is the only currency it
 * can be bought in (one Razorpay plan, no Stripe price).
 */
export function pricingOffers(foundingAvailable: boolean, charging: Currency) {
  const pro = PRICES[charging].pro;
  return [
    {
      "@type": "Offer",
      name: "Free",
      price: 0,
      priceCurrency: charging,
      url: `${SITE_URL}/signup`,
    },
    {
      "@type": "Offer",
      name: "Pro monthly",
      price: pro.monthly.amount,
      priceCurrency: charging,
      description: "Billed monthly",
      url: `${PRICING_URL}#request-access`,
    },
    {
      "@type": "Offer",
      name: "Pro yearly",
      price: pro.yearly.amount,
      priceCurrency: charging,
      description: `${formatPrice(charging, pro.yearly.perMonth)}/month, billed yearly`,
      url: `${PRICING_URL}#request-access`,
    },
    ...(foundingAvailable
      ? [
          {
            "@type": "Offer",
            name: "Founding Pro",
            price: FOUNDING_PRO_OFFER.price,
            priceCurrency: FOUNDING_PRO_OFFER.currency,
            availability: "https://schema.org/LimitedAvailability",
            url: `${PRICING_URL}#request-access`,
          },
        ]
      : []),
  ];
}

function softwareApplicationLd(
  foundingAvailable: boolean,
  charging: Currency,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    offers: pricingOffers(foundingAvailable, charging),
  };
}

const faqPageLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

export function PricingStructuredData({
  foundingAvailable = false,
  charging,
}: {
  foundingAvailable?: boolean;
  /** The currency the instance bills in — NOT the one the visitor is looking
   *  at. See pricingOffers. */
  charging: Currency;
}): ReactElement {
  return (
    <>
      {/* Static, developer-authored payloads — no user input, safe to inline. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationLd(foundingAvailable, charging)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageLd) }}
      />
    </>
  );
}
