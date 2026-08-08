import { PRO_FOUNDING_PRICE } from "@/utils/constants/pricing";
import type { PricingPlan } from "@/types";

/**
 * The plan cards on /pricing. Prices are NOT here — each card names the row of
 * `PRICES` it quotes (`priceTier`) and priceForCadence reads the amount in
 * whichever currency the visitor has selected. Restating them would give the
 * page a second source of truth for a number the checkout also holds.
 *
 * Every credit claim below is arithmetic over
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
    priceTier: "pro",
    suits: "For people who want their network captured, searchable, and ready before a meeting.",
    highlight: true,
    badge: "Most popular",
    features: [
      "300 AI credits a month — or 150 scans plus 150 notes",
      "Enough for 15 deep-research runs on people or companies",
      // Was "Enrichment & job-change alerts (watch up to 25 contacts)". The
      // alerts come from the nightly signal-detection job, which no-ops with no
      // web-search provider configured — see ./comparison.ts and
      // FEATURE_LABELS.enrichment in @/utils/constants/plans.
      "On-demand enrichment — research a person or company",
      "Pre-meeting briefs, MCP clients, WhatsApp & Telegram capture, and API tokens",
    ],
    cta: "Get Pro — skip the queue",
    ctaHref: "/signup",
  },
  {
    tier: "Power",
    priceTier: "power",
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
    ctaHref: "/signup",
  },
];

/**
 * Founding Pro, as the page quotes it — IN RUPEES, because that is the only
 * currency it can be bought in: the offer is one Razorpay plan
 * (RAZORPAY_PLAN_PRO_FOUNDING_YEARLY, ₹6,999/year against ₹8,499) and packages/ee
 * deliberately has no Stripe price for it, so a USD checkout can never mint a
 * seat the cap doesn't see. Quoting $79 while charging ₹6,999 is the failure
 * this replaces — and it is why this one price ignores the /pricing currency
 * toggle: the toggle switches an approximate display, this is the charge.
 *
 * Derived from PRO_FOUNDING_PRICE rather than restated, so the card and the
 * in-app claim button cannot drift. NO SEAT NUMBERS here on purpose: the cap is
 * server state (`FOUNDING_SEAT_CAP`) and the card prints the gate's `seatCap`,
 * while how many are LEFT is no longer shown publicly at all — "500 of 500
 * left" advertises that nobody has bought anything. Admins read the claimed
 * count on /app/admin; buyers see only that the offer still exists.
 */
const FOUNDING_INR = PRO_FOUNDING_PRICE.INR;
if (!FOUNDING_INR.originalAmount) {
  throw new Error("Founding Pro needs a standard yearly price to be a saving against");
}

export const FOUNDING_PRO_OFFER = {
  currency: "INR",
  price: FOUNDING_INR.amount,
  standardYearlyPrice: FOUNDING_INR.originalAmount,
  savings: FOUNDING_INR.originalAmount - FOUNDING_INR.amount,
} as const;
