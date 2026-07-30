import { getCurrentUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/request-scope";
import { getBillingGate } from "@/lib/hosted/gate";
import { activeGrantedCredits, getAiBudgetConfig, resolvePlanAllowance } from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, getSetting } from "@/lib/repo/settings";
import { isAiAllowancePlan } from "@/utils/constants/ai-budget";
import { FREE_TIER_AI_CREDITS_PER_MONTH } from "@/utils/constants/app";
import type { AiBudgetConfig, AiPlanAllowances } from "@/types";

/**
 * THE ONE PLACE the monthly AI-credit ceiling is decided. Precedence, highest
 * first — this list is the contract, and lib/__tests__/ai-action-metering pins
 * every rung of it:
 *
 *   1. Per-user admin override (`settings.ai_monthly_cap_override`). Wins
 *      OUTRIGHT, including over a running promotion: an admin who typed a number
 *      against one account must not have it silently replaced by a campaign.
 *      (To lift such a user during a promotion, clear the override or add a
 *      grant — grants are additive on top of it.)
 *   2. Active instance-wide promotion ("everyone gets 1000 credits this month").
 *      Applies whether or not plan-cap enforcement is on, because a generous
 *      month must not require turning caps on for everybody.
 *   3. Plan allowance — ONLY when the master switch is on AND a plan is actually
 *      in play. Admin-edited value if set, else the constant in
 *      utils/constants/plans.ts. A `null` allowance means no ceiling.
 *   4. `DHAGA_AI_MONTHLY_CAP` (the self-host env override).
 *   5. FREE_TIER_AI_CREDITS_PER_MONTH (0 — cloud AI is a paid feature).
 *
 * Then, on top of whichever rung won: + every active GRANT for this user. Grants
 * are additive make-goods and never touch `ai_actions`, so recorded usage is
 * unchanged and still auditable.
 */

/**
 * Self-hosters raise the cap via DHAGA_AI_MONTHLY_CAP; hosted free tier = 0
 * (cloud AI is a paid feature). A self-hoster who wants AI on the free tier
 * sets this env var to a positive number. Denominated in CREDITS — a card scan
 * costs 1, heavier actions cost more (see @dhaga/core's credit table).
 */
export function monthlyAiCap(): number {
  const fromEnv = Number(process.env.DHAGA_AI_MONTHLY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : FREE_TIER_AI_CREDITS_PER_MONTH;
}

/**
 * A per-user monthly AI-credit allowance an admin can grant, stored on the
 * acting user's `ai_monthly_cap_override` setting. Returns a positive integer
 * or null (absent / blank / 0 / negative / non-integer → no override).
 */
async function resolveAiCapOverride(): Promise<number | null> {
  const raw = await getSetting(AI_MONTHLY_CAP_OVERRIDE_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The acting user, for callers that don't carry an id (the settings page reads
 *  its AI line with no argument). Mirrors db/request-scope.ts: outside a real
 *  request `getCurrentUser()` throws, which is just "no session". */
async function actingUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  return (await getCurrentUser().catch(() => null))?.id ?? null;
}

/**
 * `number` = this plan's ceiling, `null` = this plan has none, `undefined` = no
 * plan is in play (billing isn't running on this instance, or there's no user),
 * in which case plan-cap enforcement simply doesn't apply and the env/free-tier
 * default governs. A self-hosted build always lands on `undefined`.
 */
async function planAllowanceFor(
  userId: string,
  allowances: AiPlanAllowances,
): Promise<number | null | undefined> {
  const summary = await (await getBillingGate()).getPlanSummary(userId);
  if (!summary) return undefined;
  const plan = summary.status === "active" ? summary.plan : "free";
  if (!isAiAllowancePlan(plan)) return undefined;
  return resolvePlanAllowance(plan, allowances);
}

/** Rungs 1–3 without the grant layer. Returns `null` for "no ceiling". */
async function resolveCeiling(
  config: AiBudgetConfig,
  userId: string | null,
): Promise<number | null> {
  const override = await resolveAiCapOverride();
  if (override !== null) return override;

  if (config.promotionCredits !== null) return config.promotionCredits;

  if (config.enforcePlanCaps && userId) {
    const allowance = await planAllowanceFor(userId, config.allowances);
    if (allowance !== undefined) return allowance;
  }
  return monthlyAiCap();
}

/**
 * The cap actually enforced for the acting user, grants included. Pass `userId`
 * wherever it's known (background jobs have no session); it falls back to the
 * current session otherwise. When the winning rung says "no ceiling" this
 * returns the env/free-tier number and `hasUnlimitedAiCredits()` returns true —
 * exactly the shape callers already use (`aiUsageLabel` ignores `cap` when
 * `unlimited`), so nothing about today's display changes.
 */
export async function effectiveMonthlyAiCap(userId?: string): Promise<number> {
  const config = await getAiBudgetConfig();
  const ceiling = await resolveCeiling(config, await actingUserId(userId));
  return (ceiling ?? monthlyAiCap()) + (await activeGrantedCredits());
}

/**
 * Whether this user bypasses the monthly cap entirely.
 *
 * WITH THE MASTER SWITCH OFF (the default) this is exactly `hasUnlimitedAi` —
 * the behaviour every paying customer has today, and what the pricing page
 * sells. WITH IT ON, the credit ladder decides instead: a plan whose allowance
 * is `null` still has no ceiling, but Pro (300 by default) now does. A per-user
 * override or a running promotion is an explicit number, so it beats both.
 */
export async function hasUnlimitedAiCredits(userId: string): Promise<boolean> {
  const config = await getAiBudgetConfig();
  if (!config.enforcePlanCaps) {
    return (await getBillingGate()).hasUnlimitedAi(userId, await getDb());
  }
  return (await resolveCeiling(config, userId)) === null;
}
