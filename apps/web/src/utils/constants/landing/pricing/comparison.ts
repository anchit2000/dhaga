import type { PlanComparisonRow } from "@/types";

/**
 * Side-by-side plan comparison shown on /pricing. Every cell restates a claim
 * already made in PRICING_PLANS, the FAQ answers, or BRD §8.3 — nothing here
 * introduces a limit the product doesn't document elsewhere.
 */
export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    feature: "Capture & notes",
    free: "✓ Unlimited",
    annual: "✓ Unlimited",
    pro: "✓ Unlimited",
  },
  {
    feature: "Full CRM, manual capture",
    free: "✓",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "On-device voice transcription",
    free: "✓ Audio never leaves your browser",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Keyword search & event grouping",
    free: "✓ Never touches cloud AI",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Cloud AI — card reads, note extraction, NL search, drafts",
    free: "✗ Paid feature",
    annual: "✓ No monthly cap",
    pro: "✓ No monthly cap",
  },
  {
    feature: "Pre-meeting briefs",
    free: "✗",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Enrichment & job-change alerts",
    free: "✗",
    annual: "✓ Watch up to 25 contacts",
    pro: "✓ Watch up to 25 contacts",
  },
  {
    feature: "Encrypted multi-device sync",
    free: "✗",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Full export — CSV, vCard, JSON",
    free: "✓",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Self-host the whole stack (AGPL)",
    free: "✓",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Bring your own API key or a local model (self-hosted)",
    free: "✓",
    annual: "✓",
    pro: "✓",
  },
  {
    feature: "Founding-member badge in the repo",
    free: "✗",
    annual: "✓ First 500 seats",
    pro: "✗",
  },
];

/** Maps a `PricingPlan.tier` to its column in `PLAN_COMPARISON_ROWS`, so the
 *  table's columns can be driven straight off PRICING_PLANS (one source of
 *  truth for order, labels, and prices). */
export const PLAN_COMPARISON_CELL_KEYS: Record<
  string,
  keyof Omit<PlanComparisonRow, "feature">
> = {
  Free: "free",
  Annual: "annual",
  Pro: "pro",
};
