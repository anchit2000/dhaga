import { randomUUID } from "node:crypto";
import { count, gte, sql } from "drizzle-orm";
import { creditsForAiAction, type AiActionFeature, type LLMUsage } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import { currentAiActionScope } from "./action-scope";

function monthStart(): Date {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Meter one model round-trip against the user's AI budget.
 *
 * The UNIT IS THE ACTION, not the call. Inside a `withAiAction` scope every
 * call folds into that action's single row, adding its tokens to the running
 * total — so a card scan that takes two model calls is one action whose cost is
 * the sum of both. Outside a scope (a lone call that is its own action) the row
 * is a fresh insert, which is also what every pre-scope history row looks like:
 * nothing about existing rows changes, and no schema change is needed.
 *
 * `feature` is a fallback: inside a scope the ACTION's feature wins, so a note
 * extraction that runs as part of enrichment is billed as enrichment rather
 * than counting as a second, differently-priced action.
 *
 * `model` is set by the call that opens the action and left alone afterwards —
 * a mixed-tier action (Haiku plan + Sonnet answer) is labelled by its first
 * model while its token totals stay complete. Per-call model attribution is
 * deliberately not retained; nothing in the app prices this table per row.
 */
export async function recordAiAction(
  feature: AiActionFeature,
  model: string,
  usage: LLMUsage,
): Promise<void> {
  const db = await getDb();
  const scope = currentAiActionScope();
  await db
    .insert(aiActions)
    .values({
      id: scope?.id ?? randomUUID(),
      feature: scope?.feature ?? feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })
    .onConflictDoUpdate({
      target: aiActions.id,
      set: {
        inputTokens: sql`${aiActions.inputTokens} + ${usage.inputTokens}`,
        outputTokens: sql`${aiActions.outputTokens} + ${usage.outputTokens}`,
      },
    });
  // Later calls in this same action must not be re-checked against the monthly
  // cap — the action is already admitted and already counted (see assertAiBudget).
  if (scope) scope.recorded = true;
}

/**
 * Credits consumed this calendar month — the billing unit. One row is one
 * action; how many credits that action costs depends on what it was (a card
 * scan is 1, deep research is many), per @dhaga/core's credit table.
 */
export async function aiCreditsUsedThisMonth(): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ feature: aiActions.feature, n: count() })
    .from(aiActions)
    .where(gte(aiActions.createdAt, monthStart()))
    .groupBy(aiActions.feature);
  return rows.reduce((total, row) => total + row.n * creditsForAiAction(row.feature), 0);
}
