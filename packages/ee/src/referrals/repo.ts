import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { generateCode } from "./code";

/** referral_codes / referrals carry no RLS — a plain pool connection sees all rows. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

/** Retries before giving up minting a unique code (collision in a 32^8 space is
 *  astronomically unlikely; the loop is belt-and-suspenders). */
const MAX_CODE_ATTEMPTS = 8;

export interface PendingReferral {
  id: string;
  code: string;
  referrerUserId: string;
  refereeUserId: string;
}

/**
 * The caller's stable referral code, minted on first read. Advisory-locked on
 * userId (same pattern as billing upsertSubscription) so two concurrent first
 * reads for the same user can't insert two codes; the insert uses
 * `on conflict (code) do nothing` to shrug off a cross-user code collision
 * without aborting the transaction (a raw unique-violation would).
 */
export async function getOrCreateCode(userId: string): Promise<string> {
  const conn = await db();
  return conn.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const existing = await tx.execute(
      sql`select code from referral_codes where user_id = ${userId} limit 1`,
    );
    const found = (existing.rows[0] as { code: string } | undefined)?.code;
    if (found) return found;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateCode();
      const inserted = await tx.execute(
        sql`insert into referral_codes (user_id, code) values (${userId}, ${code})
            on conflict (code) do nothing returning code`,
      );
      if (inserted.rows.length > 0) return code;
    }
    throw new Error("referral: could not mint a unique code after retries");
  });
}

/** Referrer user id that owns `code`, or null if the code is unknown. */
export async function findCode(code: string): Promise<string | null> {
  const res = await (await db()).execute(
    sql`select user_id from referral_codes where code = ${code} limit 1`,
  );
  return (res.rows[0] as { user_id: string } | undefined)?.user_id ?? null;
}

/**
 * Insert a pending referrer→referee link. UNIQUE(code, referee_user_id) makes
 * this idempotent per referee — a repeat signup under the same code returns
 * false rather than writing a second row.
 */
export async function insertPendingReferral(input: {
  code: string;
  referrerUserId: string;
  refereeUserId: string;
  refereeEmail: string;
}): Promise<boolean> {
  const res = await (await db()).execute(
    sql`insert into referrals (id, code, referrer_user_id, referee_user_id, referee_email, status)
        values (${randomUUID()}, ${input.code}, ${input.referrerUserId}, ${input.refereeUserId}, ${input.refereeEmail}, 'pending')
        on conflict (code, referee_user_id) do nothing
        returning id`,
  );
  return res.rows.length > 0;
}

/** The still-pending referral for a referee (the one to reward on verify), or null. */
export async function findPendingReferralByReferee(
  refereeUserId: string,
): Promise<PendingReferral | null> {
  const res = await (await db()).execute(
    sql`select id, code, referrer_user_id, referee_user_id
        from referrals where referee_user_id = ${refereeUserId} and status = 'pending' limit 1`,
  );
  const row = res.rows[0] as
    | { id: string; code: string; referrer_user_id: string; referee_user_id: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    referrerUserId: row.referrer_user_id,
    refereeUserId: row.referee_user_id,
  };
}

/** Flip a pending referral to rewarded (idempotent: only transitions from pending). */
export async function markRewarded(id: string, rewardKind: string): Promise<void> {
  await (await db()).execute(
    sql`update referrals set status = 'rewarded', reward_kind = ${rewardKind}, rewarded_at = now()
        where id = ${id} and status = 'pending'`,
  );
}

/** How many referrals this advocate has already had rewarded (for the cap). */
export async function countRewardedFor(referrerUserId: string): Promise<number> {
  const res = await (await db()).execute(
    sql`select (count(*))::int as n from referrals
        where referrer_user_id = ${referrerUserId} and status = 'rewarded'`,
  );
  return (res.rows[0] as { n: number } | undefined)?.n ?? 0;
}

/** Advocate-facing counts, minting the code if absent. */
export async function summaryFor(
  userId: string,
): Promise<{ code: string; rewardedCount: number; pendingCount: number }> {
  const code = await getOrCreateCode(userId);
  const res = await (await db()).execute(
    sql`select
          (count(*) filter (where status = 'rewarded'))::int as rewarded,
          (count(*) filter (where status = 'pending'))::int as pending
        from referrals where referrer_user_id = ${userId}`,
  );
  const row = res.rows[0] as { rewarded: number; pending: number } | undefined;
  return { code, rewardedCount: row?.rewarded ?? 0, pendingCount: row?.pending ?? 0 };
}
