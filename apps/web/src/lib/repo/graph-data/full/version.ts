import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";

/**
 * Cheap per-user graph version for ETag revalidation: one round-trip of
 * scalar aggregates (RLS scopes every subquery to the tenant), no payload
 * assembly. Counts + max timestamps cover inserts/updates/tombstones; tables
 * whose payload-visible columns can mutate WITHOUT a timestamp (companies'
 * name/sector, events' name, node_types' name/slug/color) fold an id-ordered
 * md5 over those columns instead, so e.g. a company rename can never be
 * masked behind a 304. graph_layouts is deliberately excluded: any settled
 * layout for the same graph hash is valid, and including it would churn the
 * ETag on our own layout uploads.
 */
export async function fetchGraphVersion(): Promise<string> {
  const db = await getDb();
  const result = (await db.execute(sql`
    SELECT md5(concat_ws('|',
      (SELECT concat(count(*), ':', max(updated_at)) FROM contacts),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(concat(name, ':', sector), ',' ORDER BY id), ''))) FROM companies),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(name, ',' ORDER BY id), ''))) FROM events),
      (SELECT concat(count(*), ':', max(updated_at)) FROM entities),
      (SELECT concat(count(*), ':', max(created_at), ':', max(deleted_at)) FROM edges),
      (SELECT concat(count(*), ':', max(scanned_at)) FROM event_contacts),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(concat(name, ':', slug, ':', color), ',' ORDER BY id), ''))) FROM node_types),
      (SELECT concat(count(*), ':', max(created_at)) FROM relationship_types)
    )) AS version
  `)) as unknown as { rows: { version: string }[] };
  return result.rows[0].version;
}
