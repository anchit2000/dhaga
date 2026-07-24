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
