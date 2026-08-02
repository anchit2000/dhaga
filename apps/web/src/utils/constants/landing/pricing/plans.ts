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
    monthlyPrice: 0,
    yearlyMonthlyPrice: 0,
    yearlyTotal: 0,
    suits: "For a few new people a month, and for trying the AI before paying for it.",
    highlight: false,
    features: [
      "10 AI credits a month — 10 card scans, or 5 scans plus 5 notes",
      "Unlimited contacts, notes, facts & follow-ups — never metered",
      "Keyword search, event grouping & full export, always free",
      "Self-host everything",
    ],
    cta: "Start free",
    ctaHref: "/signup",
  },
  {
    tier: "Pro",
    monthlyPrice: 10,
    yearlyMonthlyPrice: 8,
    yearlyTotal: 96,
    suits: "For people who want their network captured, searchable, and ready before a meeting.",
    highlight: true,
    badge: "Most popular",
    features: [
      "300 AI credits a month — or 150 scans plus 150 notes",
      "Enough for 15 deep-research runs on people or companies",
      "Enrichment & job-change alerts (watch up to 25 contacts)",
      "Encrypted multi-device sync & pre-meeting briefs",
    ],
    cta: "Request Pro access",
    ctaHref: "#request-access",
  },
  {
    tier: "Power",
    monthlyPrice: 30,
    yearlyMonthlyPrice: 24,
    yearlyTotal: 288,
    suits: "For high-volume relationship work, research, and busy event months.",
    highlight: false,
    badge: "Coming soon",
    comingSoon: true,
    features: [
      "1,000 AI credits every month",
      "Everything in Pro",
      "Room for conference weeks and deeper research",
      "Priority access when the plan launches",
    ],
    cta: "Join the Power waitlist",
    ctaHref: "#request-access",
  },
];

export const FOUNDING_PRO_OFFER = {
  price: 79,
  standardYearlyPrice: 96,
  savings: 17,
  seats: 500,
} as const;
