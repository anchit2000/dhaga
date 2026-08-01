import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { openAdminConnection } from "../../db/admin-db";
import { type AiCreditGrantInput, type AiCreditGrantRecord, type GrantRow, toRecord } from "./types";

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

export type { AiCreditGrantInput, AiCreditGrantRecord } from "./types";
export { listAiCreditGrantsPage } from "./list-page";

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
