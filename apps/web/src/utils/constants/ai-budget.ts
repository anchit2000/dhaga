import {
  PLAN_AI_CREDITS_PER_MONTH,
  POWER_PLAN_AI_CREDITS_PER_MONTH,
  type EntitlementPlan,
} from "./plans";

/**
 * Runtime AI-budget controls. The constants in ./plans.ts are DEFAULTS — an
 * admin can override any of them at runtime (stored in `ai_budget_settings`,
 * read by lib/repo/ai-budget), and an admin-set number always outranks the
 * constant it replaces and the `DHAGA_AI_MONTHLY_CAP` env seed. See
 * lib/ai/metering/cap/index.ts for the one authoritative precedence list.
 */

/** "on" | "off" — the master switch for plan-cap enforcement. */
export const AI_PLAN_CAP_ENFORCEMENT_KEY = "plan_cap_enforcement";
/** JSON `{ pro: 300, lifetime: null, ... }` — admin overrides of the constants. */
export const AI_PLAN_ALLOWANCES_KEY = "plan_allowances";
/** JSON `{ credits, startsAt, endsAt, note }` — the instance-wide promotion. */
export const AI_PROMOTION_KEY = "promotion";
/** "on" | "off" — the master switch for the DOLLAR ceiling (a second, separate
 *  gate from plan-cap enforcement above; see the block comment below). */
export const AI_DOLLAR_CAP_ENFORCEMENT_KEY = "dollar_cap_enforcement";
/** Decimal string — plan monthly revenue × this = that plan's dollar ceiling. */
export const AI_DOLLAR_CAP_MULTIPLIER_KEY = "dollar_cap_multiplier";
/** Decimal string of USD — the absolute ceiling for plans with no recurring
 *  revenue, where a multiple of revenue would be $0. */
export const AI_DOLLAR_CAP_FLOOR_KEY = "dollar_cap_floor";

/**
 * The per-user monthly inference-DOLLAR ceiling — the master cost gate.
 *
 * WHY IT EXISTS: credits stopped bounding spend the moment three metered
 * features were priced at 0 credits (signal_detection, person_classification,
 * goal_matching in packages/core's credit table — deliberately free, because
 * billing an unasked-for nightly sweep at 1 credit each would be ~26× its real
 * cost). An uncredited sweep is invisible to the credit allowance, so a second
 * ceiling denominated in actual dollars sits behind it. The two are INDEPENDENT
 * — see lib/ai/metering/index.ts for which one speaks first.
 *
 * ON by default, like plan-cap enforcement: a backstop that ships off is not a
 * backstop. The switch stays for the same reason the credit one does — an
 * operator mid-incident needs a way out that is not "recompute a multiplier".
 */
export const AI_DOLLAR_CAP_ENFORCEMENT_DEFAULT = true;

/**
 * Ceiling = the plan's monthly revenue × this. 2.0 (200%) is the owner's call
 * and is a LOOSE backstop by design: typical Pro inference is ~$1.35 against $8
 * of revenue (~17% utilisation), so 200% catches a runaway account without ever
 * touching a normal one. The admin screen shows real utilisation next to it so
 * the number can be judged against data rather than intuition.
 */
export const DEFAULT_AI_DOLLAR_CAP_MULTIPLIER = 2.0;

/**
 * The absolute monthly ceiling, in USD, for a plan with NO recurring revenue.
 *
 * THIS IS THE CASE THAT BREAKS A PERCENTAGE MODEL ON DAY ONE: free is $0 of
 * revenue, so revenue × any multiplier is $0, and a $0 ceiling refuses every AI
 * action a free user attempts — including the ones their 10 free credits are
 * supposed to buy. Free therefore gets a flat dollar figure instead.
 *
 * $0.50 is sized off what free can actually spend: 10 credits of credited work
 * is ~$0.06 of inference at the blended ceiling, and the uncredited nightly
 * sweeps over a free-sized graph (~200 contacts) are ~$0.09 — so $0.50 is ~3×
 * the realistic worst month. A backstop, not a throttle; the credit allowance
 * is what actually paces a free user.
 */
export const DEFAULT_AI_DOLLAR_CAP_FLOOR_USD = 0.5;

/**
 * Monthly REVENUE per plan, in USD — the base the multiplier multiplies. This is
 * what we are actually paid per month, not the list price: Pro is sold annually
 * at $96 (STRIPE_PRICE_PRO_ANNUAL), i.e. $8/month, which is the number
 * utils/constants/plans.ts already sizes the credit allowance against. The
 * marketing $10 in landing/pricing is the undiscounted list price and is
 * deliberately NOT used here — a ceiling must be built on revenue received.
 *
 * `lifetime` is one-off, so it has no monthly revenue and no price constant
 * anywhere in the repo. Amortising it at Pro's $8 is an ASSUMPTION, stated here
 * rather than hidden: a lifetime buyer paid at least a year of Pro up front, so
 * treating them as a Pro month is the conservative floor. Replace it the moment
 * a real lifetime price exists.
 *
 * A plan at 0 falls to DEFAULT_AI_DOLLAR_CAP_FLOOR_USD instead of to a $0
 * ceiling.
 */
export const PLAN_MONTHLY_REVENUE_USD: Record<AiAllowancePlan, number> = {
  free: 0,
  pro: 8,
  lifetime: 8,
  power: 24,
};

/**
 * The per-user dollar override, stored on the acting user's row of the
 * tenant-scoped `settings` table — the same place and shape as
 * `ai_monthly_cap_override` (lib/repo/settings.ts), which is the credit
 * ladder's rung 1. Kept beside its sibling AI-budget keys rather than in
 * settings.ts so the whole dollar gate reads from one constants file.
 */
export const AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY = "ai_monthly_dollar_cap_override";

/**
 * Enforcement is ON by default: the allowances in ./plans.ts are the product,
 * so a plan's monthly credits are real unless an operator deliberately turns
 * the switch off. It shipped OFF originally only because the pricing page still
 * sold Pro and Annual as "no monthly cap"; that copy now states the allowance,
 * so the safe default is the one that matches what is sold.
 *
 * The switch stays — an operator running a self-host, a migration, or an
 * incident can turn enforcement off and fall back to `hasUnlimitedAi` plus the
 * instance default. Turning it off does NOT disable promotions or grants.
 */
export const AI_PLAN_CAP_ENFORCEMENT_DEFAULT = true;

/**
 * The plans whose monthly allowance an admin can edit. `self_hosted` is absent
 * on purpose: it is the "billing isn't running on this instance" sentinel, not
 * a plan anybody is on, and plan-cap enforcement is skipped entirely when no
 * plan is in play. `power` is now a real, sellable tier (it has price ids and
 * is an `EntitlementPlan`), so its allowance here is live rather than inert.
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
  power: "Power",
};

/** Whether an `EntitlementPlan` has an editable allowance in the ladder above. */
export function isAiAllowancePlan(plan: EntitlementPlan): plan is AiAllowancePlan & EntitlementPlan {
  return (AI_ALLOWANCE_PLANS as readonly string[]).includes(plan);
}
