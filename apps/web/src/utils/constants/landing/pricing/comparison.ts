import type { PlanComparisonRow } from "@/types";

/**
 * Side-by-side plan comparison shown on /pricing. Every cell restates a claim
 * already made in PRICING_PLANS, the FAQ answers, or BRD §8.3 — nothing here
 * introduces a limit the product doesn't document elsewhere.
 */
export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    feature: "Contacts, notes, facts & follow-ups",
    free: "✓ Unlimited",
    pro: "✓ Unlimited",
    power: "✓ Unlimited",
  },
  {
    feature: "Full CRM, manual capture",
    free: "✓",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "On-device voice transcription",
    free: "✓ Audio never leaves your browser",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Keyword search & event grouping",
    free: "✓ Never touches cloud AI",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Cloud AI — card reads, note extraction, NL search, drafts",
    free: "✓ 10 credits a month",
    pro: "✓ 300 credits a month",
    power: "✓ 1,000 credits a month",
  },
  {
    feature: "When the month's credits run out",
    free: "✓ App keeps working; AI resumes on the 1st",
    pro: "✓ Same — never an overage bill",
    power: "✓ Same — never an overage bill",
  },
  {
    feature: "Goals & address-book noise filtering",
    free: "✓ 0 credits — runs on the nightly sweep",
    pro: "✓ 0 credits",
    power: "✓ 0 credits",
  },
  {
    feature: "Pre-meeting briefs",
    free: "✗",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Enrichment & job-change alerts",
    free: "✗",
    pro: "✓ Watch up to 25 contacts",
    power: "✓ Watch up to 25 contacts",
  },
  {
    feature: "Encrypted multi-device sync",
    free: "✗",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Full export — CSV, vCard, JSON",
    free: "✓",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Self-host the whole stack (AGPL)",
    free: "✓",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Bring your own API key or a local model (self-hosted)",
    free: "✓",
    pro: "✓",
    power: "✓",
  },
  {
    feature: "Founding-member badge in the repo",
    free: "✗",
    pro: "✗",
    power: "✗",
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
  Pro: "pro",
  Power: "power",
};
