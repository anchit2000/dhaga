import { count, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";

/**
 * WHY the tests in this directory exist: AI usage used to be metered per LLM
 * call, which made the number the user sees wrong. A card scan is two model
 * round-trips (fields + a deferred verbatim transcription) and enrichment is a
 * web search plus an extraction pass — so "3 AI actions used" for one scan and
 * one enrich is a lie about what the user did, and a cap denominated in calls
 * throttles people for the product's internal implementation choices.
 *
 * The unit is the user-visible ACTION. These tests pin that: many calls collapse
 * into one action whose cost is the SUM (so the count becomes meaningful without
 * the cost becoming a lie), and the monthly cap counts actions, not calls.
 *
 * They run against the real in-memory PGlite the vitest config boots, not a
 * stub — the accumulate-on-conflict SQL is the thing under test.
 */

export interface ActionRow {
  id: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
}

export async function actionRows(): Promise<ActionRow[]> {
  const db = await getDb();
  return db
    .select({
      id: aiActions.id,
      feature: aiActions.feature,
      inputTokens: aiActions.inputTokens,
      outputTokens: aiActions.outputTokens,
    })
    .from(aiActions);
}

export async function actionCount(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(aiActions);
  return row?.n ?? 0;
}

/** Local in-memory PGlite only (DHAGA_DATA_DIR=memory://, vitest.config.ts) —
 *  never a shared database. */
export async function clearActions(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`DELETE FROM ai_actions`);
}
