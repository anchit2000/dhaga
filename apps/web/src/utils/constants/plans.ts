/**
 * Plan → feature entitlement matrix — the single source of truth for
 * payment-gated features. Marketing copy for the same plans lives in
 * ./landing/pricing.ts; keep the two in step when the pricing model changes.
 *
 * To payment-gate a new feature: add it to PlanFeature, list it under the
 * plans that include it, and call `requireFeature()` (see lib/entitlements)
 * where the feature runs. Nothing else to touch.
 *
 * The monthly cloud-AI action cap is deliberately NOT a feature here — it's
 * metering, not a boolean, and lives in lib/ai/metering.ts.
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

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  enrichment: "Company enrichment & job-change alerts",
  pre_meeting_brief: "Pre-meeting briefs",
  multi_device_sync: "Encrypted multi-device sync",
};
