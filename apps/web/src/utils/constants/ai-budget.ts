import {
  PLAN_AI_CREDITS_PER_MONTH,
  POWER_PLAN_AI_CREDITS_PER_MONTH,
  type EntitlementPlan,
} from "./plans";

/**
 * Runtime AI-budget controls. The constants in ./plans.ts are DEFAULTS — an
 * admin can override any of them at runtime (stored in `ai_budget_settings`,
 * read by lib/repo/ai-budget). Nothing here changes behaviour on its own:
 * plan-cap enforcement ships OFF, and with it off the effective cap is exactly
 * what it was before these controls existed.
 */

/** "on" | "off" — the master switch for plan-cap enforcement. */
export const AI_PLAN_CAP_ENFORCEMENT_KEY = "plan_cap_enforcement";
/** JSON `{ pro: 300, lifetime: null, ... }` — admin overrides of the constants. */
export const AI_PLAN_ALLOWANCES_KEY = "plan_allowances";
/** JSON `{ credits, startsAt, endsAt, note }` — the instance-wide promotion. */
export const AI_PROMOTION_KEY = "promotion";

/**
 * Enforcement is OFF unless an admin turns it on, and that default is the whole
 * safety story: paid plans resolve through `hasUnlimitedAi` today and the
 * pricing page sells Pro and Annual as "no monthly cap"
 * (utils/constants/landing/pricing/*). Defaulting this on would hand every
 * existing paying customer a ceiling they were never sold.
 */
export const AI_PLAN_CAP_ENFORCEMENT_DEFAULT = false;

/**
 * The plans whose monthly allowance an admin can edit. `self_hosted` is absent
 * on purpose: it is the "billing isn't running on this instance" sentinel, not
 * a plan anybody is on, and plan-cap enforcement is skipped entirely when no
 * plan is in play. `power` is sized but NOT SOLD (no Stripe price, not an
 * `EntitlementPlan`) — editable here so the ladder is reviewed as one thing,
 * inert until the tier ships.
 */
export const AI_ALLOWANCE_PLANS = ["free", "pro", "lifetime", "power"] as const;

export type AiAllowancePlan = (typeof AI_ALLOWANCE_PLANS)[number];

/** `null` = no ceiling. Sourced from ./plans.ts so there is one set of numbers. */
export const DEFAULT_AI_PLAN_ALLOWANCES: Record<AiAllowancePlan, number | null> = {
  free: PLAN_AI_CREDITS_PER_MONTH.free,
  pro: PLAN_AI_CREDITS_PER_MONTH.pro,
  lifetime: PLAN_AI_CREDITS_PER_MONTH.lifetime,
  power: POWER_PLAN_AI_CREDITS_PER_MONTH,
};

export const AI_ALLOWANCE_PLAN_LABELS: Record<AiAllowancePlan, string> = {
  free: "Free",
  pro: "Pro",
  lifetime: "Lifetime / Annual",
  power: "Power (sized, not sold)",
};

/** Whether an `EntitlementPlan` has an editable allowance in the ladder above. */
export function isAiAllowancePlan(plan: EntitlementPlan): plan is AiAllowancePlan & EntitlementPlan {
  return (AI_ALLOWANCE_PLANS as readonly string[]).includes(plan);
}
