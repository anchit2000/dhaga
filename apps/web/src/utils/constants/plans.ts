/**
 * Plan → feature entitlement matrix — the single source of truth for
 * payment-gated features. Marketing copy for the same plans lives in
 * ./landing/pricing.ts; keep the two in step when the pricing model changes.
 *
 * To payment-gate a new feature: add it to PlanFeature, list it under the
 * plans that include it, and call `requireFeature()` (see lib/entitlements)
 * where the feature runs. Nothing else to touch.
 *
 * The monthly cloud-AI credit allowance is deliberately NOT a feature here —
 * it's metering, not a boolean. The allowance per plan is below; how it is
 * counted lives in lib/ai/metering.
 */
export type PlanFeature = "enrichment" | "pre_meeting_brief" | "multi_device_sync";

/** `self_hosted` = billing isn't running on this instance (no EE / no Stripe). */
export type EntitlementPlan = "free" | "pro" | "lifetime" | "self_hosted";

export const PLAN_FEATURES: Record<EntitlementPlan, readonly PlanFeature[]> = {
  free: [],
  pro: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
  lifetime: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
  // Nothing is for sale on a self-hosted instance — the owner gets everything.
  self_hosted: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
};

/**
 * Monthly AI-credit allowance the credit model supports per plan (BRD §8.3),
 * sized off the measured cost per action in `@dhaga/core`'s credit table. The
 * worst month a user can physically spend an allowance on is all-notes (the
 * priciest credit), which holds gross margin at ~72% on Pro and Power alike
 * before any typical-mix saving:
 *
 *   Pro   $8/mo  →  300 credits, ≤$1.73 inference worst case (~72% margin)
 *   Power $24/mo → 1000 credits, ≤$5.77 inference worst case (~72% margin)
 *
 * NOT ENFORCED TODAY, on purpose. Paid plans currently resolve through
 * `hasUnlimitedAi`, which short-circuits the cap entirely — and the pricing
 * page sells Pro and Annual as "no monthly cap". Turning these numbers on is a
 * pricing decision plus a Stripe and marketing-copy change (see
 * ./landing/pricing/{plans,comparison}.ts), not a metering one. What IS enforced
 * is the free-tier/self-host cap (FREE_TIER_AI_CREDITS_PER_MONTH in ./app.ts,
 * `DHAGA_AI_MONTHLY_CAP`, and per-user admin overrides) — now denominated in
 * these same credits. `null` = no ceiling.
 */
export const PLAN_AI_CREDITS_PER_MONTH: Record<EntitlementPlan, number | null> = {
  free: 0,
  pro: 300,
  lifetime: null,
  self_hosted: null,
};

/** The Power tier is sized here but not yet sold — no Stripe price and no
 *  `EntitlementPlan` member. Kept beside its siblings so the credit ladder is
 *  reviewed as one thing when it does ship. */
export const POWER_PLAN_AI_CREDITS_PER_MONTH = 1000;

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  enrichment: "Company enrichment, job-change detection & news alerts",
  pre_meeting_brief: "Pre-meeting briefs",
  multi_device_sync: "Encrypted multi-device sync",
};
