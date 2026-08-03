import { getCurrentUser } from "@/lib/auth/guard";
import { getBillingGate } from "@/lib/hosted/gate";
import { getSetting } from "@/lib/repo/settings";
import {
  AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY,
  isAiAllowancePlan,
  PLAN_MONTHLY_REVENUE_USD,
} from "@/utils/constants/ai-budget";
import type { AiBudgetConfig, AiDollarCeiling } from "@/types";

/**
 * THE ONE PLACE the monthly inference-DOLLAR ceiling is decided — the master
 * cost gate. Mirrors ./cap/index.ts (the credit ladder) rung for rung, because
 * an operator who has learned one precedence must not have to learn a second:
 *
 *   1. Per-user admin override (`settings.ai_monthly_dollar_cap_override`).
 *      Wins outright, exactly as its credit sibling does.
 *   2. PLAN-DERIVED, when dollar enforcement is on AND a plan is in play:
 *      the plan's monthly REVENUE × the instance multiplier (default 2.0).
 *      Pro: $8 × 2.0 = $16/month.
 *   3. The FLOOR — a flat dollar figure — whenever rung 2 would compute $0
 *      because the plan has no recurring revenue. FREE IS THAT CASE, and it is
 *      how a percentage model breaks on day one: 0 × 2.0 = $0 would refuse
 *      every AI action a free user takes, including the ten their credit
 *      allowance is meant to buy. Free lands on `floorUsd` ($0.50 by default).
 *   4. NO CEILING — when no plan is in play at all (a self-host with no
 *      billing), or when an admin turns dollar enforcement off. Unlike the
 *      credit ladder, whose bottom rung is a real number, this one is null on
 *      purpose: a self-hoster pays their own provider bill, and inventing a
 *      dollar ceiling they never asked for would break their instance.
 *
 * There is deliberately NO promotion rung. A promotion grants credits — a
 * user-facing allowance — while this ceiling is the operator's cost backstop;
 * a generous month should raise what a user may DO, not raise the bill we are
 * willing to absorb without noticing.
 */

/** As `getSetting` returns a string. Absent / blank / non-numeric / negative →
 *  no override. 0 IS a valid override ("this account spends nothing more this
 *  month") — unlike the credit override, where 0 was indistinguishable from
 *  unset, a dollar lockdown on one abusive account is a real operator need. */
function parseOverride(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Mirrors ./cap/index.ts: outside a real request `getCurrentUser()` throws,
 *  which is just "no session". */
async function actingUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  return (await getCurrentUser().catch(() => null))?.id ?? null;
}

/**
 * Rungs 2–3. `undefined` = no plan is in play (billing isn't running, or there
 * is no user), which is rung 4's "no ceiling" rather than a $0 refusal.
 */
async function planCeiling(
  userId: string,
  multiplier: number,
  floorUsd: number,
): Promise<AiDollarCeiling | undefined> {
  const summary = await (await getBillingGate()).getPlanSummary(userId);
  if (!summary) return undefined;
  const plan = summary.status === "active" ? summary.plan : "free";
  if (!isAiAllowancePlan(plan)) return undefined;
  return ceilingForPlanRevenue(PLAN_MONTHLY_REVENUE_USD[plan], multiplier, floorUsd);
}

/**
 * Revenue → ceiling, pure. Shared with the admin screen so the per-plan table
 * cannot drift from what the gate enforces. The free-tier case is spelled out
 * rather than left to arithmetic: a plan with no recurring revenue gets the
 * flat floor, never revenue × multiplier, because that product is $0 and a $0
 * ceiling refuses everything.
 */
export function ceilingForPlanRevenue(
  monthlyRevenueUsd: number,
  multiplier: number,
  floorUsd: number,
): AiDollarCeiling {
  if (monthlyRevenueUsd <= 0) return { usd: floorUsd, source: "floor" };
  return { usd: monthlyRevenueUsd * multiplier, source: "plan" };
}

/**
 * The dollar ceiling in force for a user, and which rung set it. Pass `userId`
 * wherever it's known (background jobs have no session). Takes the already-read
 * config so the gate does not re-query `ai_budget_settings` per call.
 */
export async function effectiveMonthlyDollarCap(
  config: AiBudgetConfig,
  userId?: string,
): Promise<AiDollarCeiling> {
  const id = await actingUserId(userId);

  const override = parseOverride(await getSetting(AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY));
  if (override !== null) return { usd: override, source: "override" };

  if (!config.dollarCap.enforced || !id) return { usd: null, source: "unset" };

  const ceiling = await planCeiling(id, config.dollarCap.multiplier, config.dollarCap.floorUsd);
  return ceiling ?? { usd: null, source: "unset" };
}
