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
export type EntitlementPlan = "free" | "pro" | "power" | "self_hosted";

export const PLAN_FEATURES: Record<EntitlementPlan, readonly PlanFeature[]> = {
  free: [],
  pro: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
  // Power is Pro's feature set with a bigger credit allowance — the tiers are
  // separated by volume, not by capability, so nothing is gated away from Pro.
  power: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
  // Nothing is for sale on a self-hosted instance — the owner gets everything.
  self_hosted: ["enrichment", "pre_meeting_brief", "multi_device_sync"],
};

/** Power's allowance. Named separately because ai-budget.ts references it
 *  directly when sizing the dollar ceiling. */
export const POWER_PLAN_AI_CREDITS_PER_MONTH = 1000;

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
 * These are DEFAULTS, and they are ENFORCED: plan-cap enforcement ships on
 * (AI_PLAN_CAP_ENFORCEMENT_DEFAULT in ./ai-budget.ts), so a plan listed here
 * with a number is held to it. An admin can re-size any of them at runtime from
 * /app/admin/ai-credits, and that stored number wins over the constant. `null`
 * = no ceiling. See lib/ai/metering/cap/index.ts for the full precedence.
 *
 * Free gets 10 credits — enough to actually try cloud AI (10 card scans, or 5
 * scans plus 5 notes, or 5 Ask-Dhaga questions) without the free tier becoming
 * something we have to fund. It is the same rung as the instance-wide default
 * used when no plan is in play, which `DHAGA_AI_MONTHLY_CAP` seeds.
 */
export const PLAN_AI_CREDITS_PER_MONTH: Record<EntitlementPlan, number | null> = {
  free: 10,
  pro: 300,
  power: POWER_PLAN_AI_CREDITS_PER_MONTH,
  self_hosted: null,
};

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  // "job-change detection & news alerts" — the rest of the original label — is
  // deliberately gone. Those come from the nightly signal-detection job
  // (lib/jobs/detect-signals), which is driven by the web-search gateway
  // (@dhaga/core search, Firecrawl by default). With no search provider
  // configured the job no-ops, so no signal is ever detected and no alert is
  // ever raised — on any plan. The label sold a feature nobody receives.
  // On-demand enrichment is untouched by that: it runs on the LLM's own
  // web-search tool (lib/ai/enrich.ts), not the search gateway, so it ships.
  enrichment: "On-demand company & person enrichment",
  pre_meeting_brief: "Pre-meeting briefs",
  // The key stays `multi_device_sync` (it is referenced by plan data), but the
  // label says what is actually gated: the integration surfaces that let
  // something OTHER than this browser reach the graph. Three enforcement
  // points, all on the same feature — minting a personal access token
  // (lib/actions/api-keys.ts), connecting an MCP client (lib/mcp/auth.ts, which
  // covers the OAuth path a token never touches), and linking a WhatsApp or
  // Telegram chat (lib/actions/messaging.ts).
  //
  // The browser EXTENSION is deliberately absent: it authenticates with the
  // logged-in cookie session (`credentials: "include"`, apps/extension/src/popup.ts),
  // never a token, so claiming it here promised a gate that does not exist.
  // "Encrypted multi-device sync" — the original label — described a sync
  // engine that does not exist either.
  multi_device_sync: "MCP clients, WhatsApp & Telegram capture, and API tokens for the mobile app and scripts",
};

/**
 * How long a hover rests on a plan-gated control before its tooltip opens
 * (`PlanGateNotice`). Well under Base UI's 600ms default: the reason is an
 * explanation someone is actively hunting for, not an incidental label.
 */
export const PLAN_GATE_TOOLTIP_DELAY_MS = 150;
