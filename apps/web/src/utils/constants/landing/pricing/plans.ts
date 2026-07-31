import type { PricingPlan } from "@/types";

/**
 * The plan cards on / and /pricing. Every credit claim below is arithmetic over
 * two sources — the monthly allowance (`PLAN_AI_CREDITS_PER_MONTH` and
 * `FREE_TIER_AI_CREDITS_PER_MONTH`) and the per-action price
 * (`AI_ACTION_CREDITS`, mirrored in ./credits.ts):
 *
 *   Free  10  = 10 scans (10×1), or 5 scans + 5 notes (5×1 + 5×1)
 *   Pro  300  = 300 scans, or 150 scans + 150 notes, or 15 deep-research (15×20)
 *             ≈ 100 new people fully captured (100×1 scan + 100×1 note = 200)
 *               with 50 questions left over (50×2 = 100)
 *
 * "About 100 new people" is the honest read of that mix, not the ceiling — say
 * what a normal month holds, and let ./faq.ts admit what a conference month
 * costs. If either allowance changes, redo the arithmetic here before touching
 * the words.
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: "Free",
    price: "$0",
    per: "forever",
    suits: "For a few new people a month, and for trying the AI before paying for it.",
    highlight: false,
    features: [
      "10 AI credits a month — 10 card scans, or 5 scans plus 5 notes",
      "Unlimited contacts, notes, facts & follow-ups — never metered",
      "Keyword search, event grouping & full export, always free",
      "Self-host everything",
    ],
    cta: "Start free",
  },
  {
    tier: "Annual",
    price: "$79",
    strikePrice: "$99",
    per: "/year, billed annually",
    suits: "For people who'd rather make one pricing decision a year, not twelve.",
    highlight: true,
    badge: "Founding price — first 500 seats",
    features: [
      "Everything in Pro — 300 AI credits every month",
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
    suits: "Comfortably covers about 100 new people a month — scanned, noted, asked about.",
    highlight: false,
    badge: "Intro rate — limited time",
    features: [
      "300 AI credits a month — or 150 scans plus 150 notes",
      "Enough for 15 deep-research runs on people or companies",
      "Enrichment & job-change alerts (watch 25; the nightly watch is free)",
      "Encrypted multi-device sync & pre-meeting briefs",
    ],
    cta: "Go Pro",
  },
];
