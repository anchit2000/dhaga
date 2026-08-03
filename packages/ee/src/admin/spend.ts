import { sql } from "drizzle-orm";
import { openAdminConnection } from "../db/admin-db";

/**
 * Instance-wide AI SPEND for the current calendar month — the raw material for
 * the admin cost screen.
 *
 * EE returns TOKENS, never dollars: provider prices live in apps/web
 * (`utils/constants/model-pricing.ts`) and are applied by `lib/ai/cost`, so
 * there is exactly one pricing table in the repo and this module cannot drift
 * from the gate that enforces against it.
 *
 * ONE query, one connection, grouped by (user, feature, model, batch) — the
 * coarsest grouping that still prices every row exactly, since cost depends on
 * the model and on whether the call was batched, and the credited/uncredited
 * split depends on the feature. Bounded by the number of distinct combinations,
 * not by the number of actions. `ai_actions` carries RLS, so this must go
 * through the bypass connection to see every tenant's rows.
 */

function monthStartUtc(): Date {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export interface AiSpendByUserRow {
  /** Null on rows written before RLS added the column, or by a job with no user. */
  userId: string | null;
  feature: string;
  model: string;
  batch: boolean;
  inputTokens: number;
  outputTokens: number;
  actions: number;
}

interface RawSpendRow {
  user_id: string | null;
  feature: string;
  model: string;
  batch: boolean;
  input_tokens: string | number;
  output_tokens: string | number;
  actions: string | number;
}

function toNumber(value: string | number | null): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function aiSpendThisMonthByUser(): Promise<AiSpendByUserRow[]> {
  const { db, release } = await openAdminConnection();
  try {
    const result = await db.execute(sql`
      select user_id, feature, model, batch,
             sum(input_tokens) as input_tokens,
             sum(output_tokens) as output_tokens,
             count(*) as actions
      from ai_actions
      where created_at >= ${monthStartUtc()}
      group by user_id, feature, model, batch
    `);
    return (result.rows as unknown as RawSpendRow[]).map((row) => ({
      userId: row.user_id,
      feature: row.feature,
      model: row.model,
      batch: row.batch,
      inputTokens: toNumber(row.input_tokens),
      outputTokens: toNumber(row.output_tokens),
      actions: toNumber(row.actions),
    }));
  } finally {
    await release();
  }
}

/** A user's plan and per-user dollar override — everything the ceiling ladder
 *  needs that is not instance-wide, for the handful of users the cost screen
 *  actually lists. */
export interface AiCeilingContextRow {
  userId: string;
  email: string;
  /** Absent subscription row = free. */
  plan: string;
  dollarOverrideUsd: number | null;
}

interface RawContextRow {
  id: string;
  email: string;
  plan: string | null;
  status: string | null;
  dollar_override: string | null;
}

/**
 * ONE query for a bounded set of user ids — a per-user fan-out of
 * `getSubscription` + an override read would be two round-trips per user
 * against a three-connection pool, which is the exact shape that has exhausted
 * it before (docs/SCALING.md).
 */
export async function aiCeilingContextFor(
  userIds: string[],
  dollarOverrideKey: string,
): Promise<AiCeilingContextRow[]> {
  if (userIds.length === 0) return [];
  const { db, release } = await openAdminConnection();
  try {
    const result = await db.execute(sql`
      select u.id, u.email, s.plan, s.status, st.value as dollar_override
      from "user" u
      left join subscriptions s on s.user_id = u.id
      left join settings st on st.user_id = u.id and st.key = ${dollarOverrideKey}
      where u.id = any(${userIds})
    `);
    return (result.rows as unknown as RawContextRow[]).map((row) => {
      const override = row.dollar_override === null ? NaN : Number(row.dollar_override);
      return {
        userId: row.id,
        email: row.email,
        plan: row.status === "active" && row.plan ? row.plan : "free",
        dollarOverrideUsd: Number.isFinite(override) && override >= 0 ? override : null,
      };
    });
  } finally {
    await release();
  }
}
