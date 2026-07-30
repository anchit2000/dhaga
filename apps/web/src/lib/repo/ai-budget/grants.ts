import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";

/**
 * Credits granted to the ACTING user that are in force right now — the additive
 * make-good layer. Added on top of whichever ceiling wins; never subtracted from
 * and never reconciled against `ai_actions`, which stays the sole record of what
 * cloud AI actually cost.
 *
 * Scoping is the database's job, exactly as it is for `settings`: under
 * packages/ee this table carries a bespoke RLS policy
 * (`user_id IS NULL OR user_id = <tenant>`), so this unfiltered SELECT returns
 * the acting user's own grants plus every instance-wide one and nothing else.
 * A self-hosted build has no RLS — and no admin UI to write a grant — so the
 * table is empty there and this returns 0.
 */
export async function activeGrantedCredits(): Promise<number> {
  const db = await getDb();
  // Cast through unknown: db.execute()'s row type differs between the PGlite and
  // node-postgres drivers behind DhagaDb (same pattern as repo/graph-data/full.ts).
  const result = (await db.execute(sql`
    select coalesce(sum(credits), 0)::int as total
    from ai_credit_grants
    where starts_at <= now() and (ends_at is null or ends_at > now())
  `)) as unknown as { rows: { total: number | string }[] };
  return Number(result.rows[0]?.total ?? 0);
}
