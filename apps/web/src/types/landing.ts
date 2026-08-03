/**
 * Marketing-surface view models — the landing page, /pricing and the FAQ. Split
 * out of ./index.ts under the File Length Rule and re-exported from there, so
 * every `@/types` import path holds unchanged.
 */

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
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  yearlyTotal: number;
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
