import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { openAdminConnection } from "../db/admin-db";

/**
 * The AI-credit GRANT ledger, admin side.
 *
 * A grant is ADDITIVE and never destructive: it adds credits on top of whatever
 * ceiling a user already has, for a window, with a reason. It exists so an
 * operator can make people whole after a bug WITHOUT touching `ai_actions` —
 * that table is the only record of what cloud AI actually cost, and rewriting it
 * would destroy the cost history to fix a customer-service problem.
 *
 * `user_id` NULL means every user on the instance. Reads and writes go through
 * the bypass-RLS connection because an admin acts on other people's rows and
 * there is no session for them — the same reason subscription-admin.ts does.
 * Core reads the same table through the tenant connection, where the bespoke
 * policy in db/rls-ddl.ts narrows it to (mine ∪ everyone).
 */

export interface AiCreditGrantInput {
  /** null = every user on this instance. */
  userId: string | null;
  credits: number;
  reason: string;
  /** The admin user id performing the grant — kept for the audit trail. */
  grantedBy: string;
  /** null = no expiry. The admin UI defaults this to the end of the current
   *  month, because an open-ended grant re-applies every month forever. */
  endsAt: Date | null;
}

export interface AiCreditGrantRecord {
  id: string;
  userId: string | null;
  credits: number;
  reason: string;
  grantedBy: string;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
  /** Whether the grant counts right now. Decided by Postgres, not the renderer:
   *  reading a clock during render is impure (and the DB clock is the one the
   *  cap resolver compares against anyway). */
  active: boolean;
}

interface GrantRow {
  id: string;
  user_id: string | null;
  credits: number;
  reason: string;
  granted_by: string;
  /** Drizzle's node-postgres driver installs its own type parsers and hands
   *  raw-SQL timestamps back as STRINGS, not Dates — a typed `.select()` would
   *  map them, `db.execute()` does not. Coerced below; without it the admin
   *  ledger renders `RangeError: Invalid time value`. */
  starts_at: string | Date;
  ends_at: string | Date | null;
  created_at: string | Date;
  active: boolean;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toRecord(row: GrantRow): AiCreditGrantRecord {
  return {
    id: row.id,
    userId: row.user_id,
    credits: row.credits,
    reason: row.reason,
    grantedBy: row.granted_by,
    startsAt: toDate(row.starts_at),
    endsAt: row.ends_at === null ? null : toDate(row.ends_at),
    createdAt: toDate(row.created_at),
    active: row.active,
  };
}

export async function grantAiCredits(input: AiCreditGrantInput): Promise<void> {
  const { db, release } = await openAdminConnection();
  try {
    await db.execute(sql`
      insert into ai_credit_grants (id, user_id, credits, reason, granted_by, starts_at, ends_at)
      values (
        ${randomUUID()}, ${input.userId}, ${input.credits}, ${input.reason},
        ${input.grantedBy}, now(), ${input.endsAt}
      )
    `);
  } finally {
    await release();
  }
}

/** The whole ledger, newest first — the audit view on the admin AI-credits page. */
export async function listAiCreditGrants(limit = 50): Promise<AiCreditGrantRecord[]> {
  const { db, release } = await openAdminConnection();
  try {
    const result = await db.execute(sql`
      select id, user_id, credits, reason, granted_by, starts_at, ends_at, created_at,
             (starts_at <= now() and (ends_at is null or ends_at > now())) as active
      from ai_credit_grants order by created_at desc limit ${limit}
    `);
    return (result.rows as unknown as GrantRow[]).map(toRecord);
  } finally {
    await release();
  }
}

/** Grants a specific user currently benefits from: their own plus every
 *  instance-wide one — the same set core's RLS policy shows them. */
export async function activeGrantedCreditsFor(userId: string): Promise<number> {
  const { db, release } = await openAdminConnection();
  try {
    const result = await db.execute(sql`
      select coalesce(sum(credits), 0)::int as total from ai_credit_grants
      where (user_id is null or user_id = ${userId})
        and starts_at <= now() and (ends_at is null or ends_at > now())
    `);
    return Number((result.rows[0] as { total: number | string } | undefined)?.total ?? 0);
  } finally {
    await release();
  }
}

/**
 * Stop a grant applying from now on — the correction path for a mistyped
 * amount. Still not a delete: the row (and its reason and grantor) stays in the
 * ledger, it just stops counting. Idempotent.
 */
export async function endAiCreditGrantNow(id: string): Promise<void> {
  const { db, release } = await openAdminConnection();
  try {
    await db.execute(sql`
      update ai_credit_grants set ends_at = now()
      where id = ${id} and (ends_at is null or ends_at > now())
    `);
  } finally {
    await release();
  }
}
