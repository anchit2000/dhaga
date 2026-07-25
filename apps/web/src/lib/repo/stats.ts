import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";

/**
 * Every headline count for the signed-in user's graph, folded into ONE
 * aggregate round-trip. Each metric is a scalar `(SELECT count(*) …)`
 * subquery so the whole strip resolves over a single getDb() connection —
 * never a fan-out of per-count queries (that pattern has exhausted the tenant
 * pool before). RLS on the scoped connection makes every count per-user; the
 * soft-deleted tables (notes/facts/edges) exclude tombstoned rows.
 */
export interface GraphStats {
  contacts: number;
  companies: number;
  notes: number;
  facts: number;
  edges: number;
  events: number;
  entities: number;
  openFollowUps: number;
  totalFollowUps: number;
}

type StatsRow = {
  contacts: string | number;
  companies: string | number;
  notes: string | number;
  facts: string | number;
  edges: string | number;
  events: string | number;
  entities: string | number;
  open_follow_ups: string | number;
  total_follow_ups: string | number;
};

export async function getGraphStats(): Promise<GraphStats> {
  const db = await getDb();
  // count(*) returns bigint, which the driver hands back as a string — coerce
  // every column through Number() below.
  const result = (await db.execute(sql`
    SELECT
      (SELECT count(*) FROM contacts) AS contacts,
      (SELECT count(*) FROM companies) AS companies,
      (SELECT count(*) FROM notes WHERE deleted_at IS NULL) AS notes,
      (SELECT count(*) FROM facts WHERE deleted_at IS NULL) AS facts,
      (SELECT count(*) FROM edges WHERE deleted_at IS NULL) AS edges,
      (SELECT count(*) FROM events) AS events,
      (SELECT count(*) FROM entities) AS entities,
      (SELECT count(*) FROM follow_ups WHERE status = 'open') AS open_follow_ups,
      (SELECT count(*) FROM follow_ups) AS total_follow_ups
  `)) as unknown as { rows: StatsRow[] };
  const row = result.rows[0];
  return {
    contacts: Number(row.contacts),
    companies: Number(row.companies),
    notes: Number(row.notes),
    facts: Number(row.facts),
    edges: Number(row.edges),
    events: Number(row.events),
    entities: Number(row.entities),
    openFollowUps: Number(row.open_follow_ups),
    totalFollowUps: Number(row.total_follow_ups),
  };
}

const ACTIVITY_WEEKS = 8;

/** Per-week "new rows" for each headline metric, oldest→newest. */
export interface GraphActivity {
  contacts: number[];
  companies: number[];
  notes: number[];
  facts: number[];
  edges: number[];
  events: number[];
  entities: number[];
  followUps: number[];
}

/**
 * New-rows-per-week over the last ACTIVITY_WEEKS weeks, one series per metric —
 * the sparklines under each StatStrip tile. Folded into ONE round-trip (a UNION
 * of created_at across the tables, bucketed by weeks-ago) so it never fans out
 * per-metric on the shared connection. Weeks-ago bucketing (not date_trunc)
 * sidesteps any server/DB timezone mismatch.
 */
export async function getGraphActivity(): Promise<GraphActivity> {
  const db = await getDb();
  const result = (await db.execute(sql`
    SELECT metric,
           LEAST(${ACTIVITY_WEEKS - 1}, floor(extract(epoch from (now() - created_at)) / 604800))::int AS wk_ago,
           count(*)::int AS c
    FROM (
      SELECT 'contacts' AS metric, created_at FROM contacts WHERE created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'companies', created_at FROM companies WHERE created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'notes', created_at FROM notes WHERE deleted_at IS NULL AND created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'facts', created_at FROM facts WHERE deleted_at IS NULL AND created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'edges', created_at FROM edges WHERE deleted_at IS NULL AND created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'events', created_at FROM events WHERE created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'entities', created_at FROM entities WHERE created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
      UNION ALL SELECT 'followups', created_at FROM follow_ups WHERE created_at > now() - make_interval(weeks => ${ACTIVITY_WEEKS})
    ) t
    GROUP BY metric, wk_ago
  `)) as unknown as { rows: { metric: string; wk_ago: string | number; c: string | number }[] };

  const blank = (): number[] => Array.from({ length: ACTIVITY_WEEKS }, () => 0);
  const series: Record<string, number[]> = {
    contacts: blank(), companies: blank(), notes: blank(), facts: blank(),
    edges: blank(), events: blank(), entities: blank(), followups: blank(),
  };
  for (const activityRow of result.rows) {
    const arr = series[activityRow.metric];
    if (!arr) continue;
    // wk_ago 0 = this week → newest (last) slot; ACTIVITY_WEEKS-1 = oldest slot.
    const idx = ACTIVITY_WEEKS - 1 - Number(activityRow.wk_ago);
    if (idx >= 0 && idx < ACTIVITY_WEEKS) arr[idx] = Number(activityRow.c);
  }
  return {
    contacts: series.contacts, companies: series.companies, notes: series.notes,
    facts: series.facts, edges: series.edges, events: series.events,
    entities: series.entities, followUps: series.followups,
  };
}
