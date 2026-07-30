import { randomUUID } from "node:crypto";
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

/** Same in-memory PGlite. Resets the instance-wide budget controls so each case
 *  starts from "nothing configured" — i.e. today's behaviour. */
export async function clearBudgetControls(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`DELETE FROM ai_budget_settings`);
  await db.execute(sql`DELETE FROM ai_credit_grants`);
}

/**
 * Insert a grant the way the admin panel would. Written here as raw SQL rather
 * than through packages/ee: the core read path (lib/repo/ai-budget) is what the
 * cap resolver uses, and it must work on a build with no EE at all.
 */
export async function seedGrant(input: {
  userId: string | null;
  credits: number;
  reason: string;
  startsAt?: Date;
  endsAt?: Date | null;
}): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into ai_credit_grants (id, user_id, credits, reason, granted_by, starts_at, ends_at)
    values (
      ${randomUUID()}, ${input.userId}, ${input.credits}, ${input.reason}, 'admin-test',
      ${input.startsAt ?? new Date()}, ${input.endsAt ?? null}
    )
  `);
}
