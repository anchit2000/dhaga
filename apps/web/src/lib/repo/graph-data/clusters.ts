import { count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts } from "@/lib/db/schema";
import {
  OTHER_TAG_KEY,
  UNASSIGNED_KEY,
  UNKNOWN_LOCATION_KEY,
  type Cluster,
  type ClusterDimension,
} from "./types";

async function companyClusters(): Promise<Cluster[]> {
  const db = await getDb();
  const [rows, [{ n: unassigned }]] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name, contactCount: count(contacts.id) })
      .from(companies)
      .innerJoin(contacts, eq(contacts.companyId, companies.id))
      .groupBy(companies.id, companies.name)
      .orderBy(desc(count(contacts.id))),
    db.select({ n: count() }).from(contacts).where(isNull(contacts.companyId)),
  ]);
  const clusters: Cluster[] = rows.map((row) => ({
    key: row.id,
    label: row.name,
    contactCount: row.contactCount,
  }));
  if (unassigned > 0) clusters.push({ key: UNASSIGNED_KEY, label: "Unassigned", contactCount: unassigned });
  return clusters;
}

/** Same aggregation shape as listAllTags() (repo/contacts/queries.ts) — jsonb
 *  tag arrays are small, so bucketing in JS avoids a LATERAL-unnest raw query
 *  the ORM can't express cleanly. A contact with N tags counts toward N clusters
 *  (non-exclusive, like map category pins), matching how tags already work. */
async function tagClusters(): Promise<Cluster[]> {
  const db = await getDb();
  const rows = await db.select({ tags: contacts.tags }).from(contacts);
  const counts = new Map<string, number>();
  let other = 0;
  for (const row of rows) {
    if (row.tags.length === 0) {
      other++;
      continue;
    }
    for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const clusters: Cluster[] = [...counts.entries()]
    .map(([tag, contactCount]) => ({ key: tag, label: tag, contactCount }))
    .sort((a, b) => b.contactCount - a.contactCount);
  if (other > 0) clusters.push({ key: OTHER_TAG_KEY, label: "Other", contactCount: other });
  return clusters;
}

async function locationClusters(): Promise<Cluster[]> {
  const db = await getDb();
  const [rows, [{ n: unknown }]] = await Promise.all([
    db
      .select({ location: contacts.location, contactCount: count() })
      .from(contacts)
      .where(isNotNull(contacts.location))
      .groupBy(contacts.location)
      .orderBy(desc(count())),
    db.select({ n: count() }).from(contacts).where(isNull(contacts.location)),
  ]);
  const clusters: Cluster[] = rows.map((row) => ({
    key: row.location as string,
    label: row.location as string,
    contactCount: row.contactCount,
  }));
  if (unknown > 0) clusters.push({ key: UNKNOWN_LOCATION_KEY, label: "Unknown location", contactCount: unknown });
  return clusters;
}

/** Level-0 "zoomed out" view: cluster bubbles with counts, never individual
 *  contacts — cost is bounded by company/tag/location cardinality, never
 *  total contact count or jsonb payload size (see docs/TESTING.md §10). */
export async function fetchGraphClusters(dimension: ClusterDimension): Promise<Cluster[]> {
  if (dimension === "tag") return tagClusters();
  if (dimension === "location") return locationClusters();
  return companyClusters();
}
