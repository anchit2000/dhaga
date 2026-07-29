import type { PricingPlan } from "@/types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: "Free",
    price: "$0",
    per: "forever",
    highlight: false,
    features: [
      "Unlimited capture & notes",
      "Full CRM, manual capture — no cloud AI",
      "Full export, anytime",
      "Self-host everything",
    ],
    cta: "Start free",
  },
  {
    tier: "Annual",
    price: "$79",
    strikePrice: "$99",
    per: "/year, billed annually",
    highlight: true,
    badge: "Founding price — first 500 seats",
    features: [
      "Everything in Pro, all year",
      "All future updates included",
      "Founding-member badge in the repo",
      "Locks in before public launch pricing",
    ],
    cta: "Reserve founding seat",
  },
  {
    tier: "Pro",
    price: "$8",
    strikePrice: "$20",
    per: "/mo, billed yearly",
    highlight: false,
    badge: "Intro rate — limited time",
    features: [
      "No cap on capture, search & drafts",
      "Enrichment & job-change alerts (watch up to 25)",
      "Encrypted multi-device sync",
      "Pre-meeting briefs",
    ],
    cta: "Go Pro",
  },
];
