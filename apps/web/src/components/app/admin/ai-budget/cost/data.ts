// Dhaga Cloud only — see packages/ee/LICENSE.
import { creditsForAiAction } from "@dhaga/core/src/metering/credits";
import { aiCeilingContextFor, aiSpendThisMonthByUser, type AiSpendByUserRow } from "@dhaga/ee/admin";
import { ceilingForPlanRevenue } from "@/lib/ai/metering";
import { costOfAiAction } from "@/lib/ai/cost";
import {
  AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY,
  isAiAllowancePlan,
  PLAN_MONTHLY_REVENUE_USD,
} from "@/utils/constants/ai-budget";
import { ADMIN_TOP_SPENDER_LIMIT } from "@/utils/constants/ai-credits";
import { labelForFeature } from "./labels";
import type {
  AiCostSummary,
  AiDollarCapConfig,
  AiDollarCeiling,
  AiUncreditedFeatureCost,
  AiUserCostRow,
} from "@/types";
import type { EntitlementPlan } from "@/utils/constants/plans";

/**
 * Real instance-wide AI cost for the current month, computed from recorded
 * tokens. Nothing here is estimated: `ai_actions` stores model, both token
 * counts and whether the call was batched, so `lib/ai/cost` prices every row
 * exactly — which is why this can be shown next to what the credit table
 * ASSUMED and the drift read off directly.
 *
 * TWO sequential cross-tenant reads, never `Promise.all`: the tenant pool holds
 * three connections and a fan-out here is the pattern that has exhausted it
 * before (docs/SCALING.md).
 */

function isUncredited(feature: string): boolean {
  return creditsForAiAction(feature) === 0;
}

function usdOf(row: AiSpendByUserRow): number {
  return costOfAiAction({
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    batch: row.batch,
  });
}

function uncreditedBreakdown(rows: AiSpendByUserRow[]): AiUncreditedFeatureCost[] {
  const byFeature = new Map<string, AiUncreditedFeatureCost>();
  for (const row of rows) {
    if (!isUncredited(row.feature)) continue;
    const entry = byFeature.get(row.feature) ?? {
      feature: row.feature,
      label: labelForFeature(row.feature),
      actions: 0,
      usd: 0,
    };
    entry.actions += row.actions;
    entry.usd += usdOf(row);
    byFeature.set(row.feature, entry);
  }
  return [...byFeature.values()].sort((a, b) => b.usd - a.usd);
}

/** The same ladder `lib/ai/metering/dollar-cap.ts` enforces, applied to a plan
 *  read cross-tenant rather than from the acting session. Sharing
 *  `ceilingForPlanRevenue` is what stops the screen and the gate disagreeing. */
function ceilingFor(
  plan: string,
  overrideUsd: number | null,
  config: AiDollarCapConfig,
): AiDollarCeiling {
  if (overrideUsd !== null) return { usd: overrideUsd, source: "override" };
  if (!config.enforced) return { usd: null, source: "unset" };
  if (!isAiAllowancePlan(plan as EntitlementPlan)) return { usd: null, source: "unset" };
  return ceilingForPlanRevenue(
    PLAN_MONTHLY_REVENUE_USD[plan as keyof typeof PLAN_MONTHLY_REVENUE_USD],
    config.multiplier,
    config.floorUsd,
  );
}

async function topUsers(
  rows: AiSpendByUserRow[],
  config: AiDollarCapConfig,
): Promise<AiUserCostRow[]> {
  const byUser = new Map<string, { usd: number; credits: number }>();
  for (const row of rows) {
    if (row.userId === null) continue;
    const entry = byUser.get(row.userId) ?? { usd: 0, credits: 0 };
    entry.usd += usdOf(row);
    entry.credits += row.actions * creditsForAiAction(row.feature);
    byUser.set(row.userId, entry);
  }

  const ranked = [...byUser.entries()]
    .sort(([, a], [, b]) => b.usd - a.usd)
    .slice(0, ADMIN_TOP_SPENDER_LIMIT);
  const context = await aiCeilingContextFor(
    ranked.map(([userId]) => userId),
    AI_MONTHLY_DOLLAR_CAP_OVERRIDE_KEY,
  );
  const byId = new Map(context.map((row) => [row.userId, row]));

  return ranked.map(([userId, totals]) => {
    const info = byId.get(userId);
    const ceiling = ceilingFor(info?.plan ?? "free", info?.dollarOverrideUsd ?? null, config);
    return {
      userId,
      email: info?.email ?? "(deleted account)",
      plan: info?.plan ?? "free",
      usd: totals.usd,
      credits: totals.credits,
      ceiling,
      utilisationPct:
        ceiling.usd === null || ceiling.usd === 0 ? null : (totals.usd / ceiling.usd) * 100,
    };
  });
}

export async function getAiCostSummary(config: AiDollarCapConfig): Promise<AiCostSummary> {
  const rows = await aiSpendThisMonthByUser();

  let creditedUsd = 0;
  let uncreditedUsd = 0;
  let totalCredits = 0;
  let totalActions = 0;
  for (const row of rows) {
    const usd = usdOf(row);
    if (isUncredited(row.feature)) uncreditedUsd += usd;
    else creditedUsd += usd;
    totalCredits += row.actions * creditsForAiAction(row.feature);
    totalActions += row.actions;
  }

  return {
    totalUsd: creditedUsd + uncreditedUsd,
    creditedUsd,
    uncreditedUsd,
    totalCredits,
    totalActions,
    measuredUsdPerCredit: totalCredits > 0 ? creditedUsd / totalCredits : null,
    allInUsdPerCredit: totalCredits > 0 ? (creditedUsd + uncreditedUsd) / totalCredits : null,
    uncreditedFeatures: uncreditedBreakdown(rows),
    topUsers: await topUsers(rows, config),
  };
}
