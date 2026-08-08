/**
 * Marketing-surface view models — the landing page, /pricing and the FAQ. Split
 * out of ./index.ts under the File Length Rule and re-exported from there, so
 * every `@/types` import path holds unchanged.
 */
import type { BillingTier } from "@/utils/constants/pricing";

export interface HowItWorksStep {
  step: string;
  title: string;
  body: string;
}

export interface AskExample {
  query: string;
  answer: string;
  answerName: string;
  receipt: string;
}

export interface ComparisonRow {
  feature: string;
  dhaga: string;
  cardApps: string;
  personalCrms: string;
  enterprise: string;
}

export interface PricingPlan {
  tier: string;
  /** Which row of `PRICES` (@/utils/constants/pricing) this card quotes.
   *  Omitted for Free, which is 0 in every currency. The amounts are NOT
   *  restated here: the cards render whichever currency the visitor is
   *  looking at, so one source per (tier, cadence, currency) is the only way
   *  a card and a checkout can't disagree. */
  priceTier?: BillingTier;
  /** One plain sentence on who the plan is for, in people-per-month terms. */
  suits?: string;
  highlight: boolean;
  badge?: string;
  comingSoon?: boolean;
  features: string[];
  cta: string;
  ctaHref: string;
}

/** One row of the /pricing plan-comparison table. Cells use the same
 *  "✓ …" / "✗ …" prefix convention as `ComparisonRow`; keys map to
 *  `PricingPlan.tier` (Free / Pro / Power). */
export interface PlanComparisonRow {
  feature: string;
  free: string;
  pro: string;
  power: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
