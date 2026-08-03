import { count, gte, sum } from "drizzle-orm";
import { creditsForAiAction } from "@dhaga/core";
import { totalCostOfAiActions } from "@/lib/ai/cost";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import type { AiSpendGroup } from "@/types";

/**
 * What the acting user's AI actually COST this month, in dollars, from the
 * tokens already recorded. The dollar gate is enforced against this; credits are
 * enforced against `aiCreditsUsedThisMonth()` in ./record.ts. They are two
 * independent ceilings over the same rows — see ./index.ts for the precedence.
 *
 * ONE query, grouped by (feature, model, batch), which is the coarsest grouping
 * that still prices every row exactly: cost depends on the model and on whether
 * the call was batched, and the credited/uncredited split depends on the
 * feature. Deliberately not a `getDb()` fan-out — the gate runs on the AI hot
 * path and the tenant pool holds three connections (docs/SCALING.md).
 */

function monthStart(): Date {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** `sum()` comes back as a numeric string (or null for an empty group). */
function toNumber(value: string | number | null): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/** Per (feature, model, batch) totals for the current UTC month. The one read
 *  behind both the gate and the admin cost screen, so they can never disagree. */
export async function aiSpendGroupsThisMonth(): Promise<AiSpendGroup[]> {
  const db = await getDb();
  const rows = await db
    .select({
      feature: aiActions.feature,
      model: aiActions.model,
      batch: aiActions.batch,
      inputTokens: sum(aiActions.inputTokens),
      outputTokens: sum(aiActions.outputTokens),
      actions: count(),
    })
    .from(aiActions)
    .where(gte(aiActions.createdAt, monthStart()))
    .groupBy(aiActions.feature, aiActions.model, aiActions.batch);

  return rows.map((row) => ({
    feature: row.feature,
    model: row.model,
    batch: row.batch,
    inputTokens: toNumber(row.inputTokens),
    outputTokens: toNumber(row.outputTokens),
    actions: row.actions,
    credits: row.actions * creditsForAiAction(row.feature),
  }));
}

/** Dollars of inference the acting user has consumed this calendar month. */
export async function aiDollarsUsedThisMonth(): Promise<number> {
  return totalCostOfAiActions(await aiSpendGroupsThisMonth());
}
