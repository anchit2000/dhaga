import { asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  GRAPH_TAG_EDGE_BUDGET,
  GRAPH_TAG_HUB_CAP,
  GRAPH_TAG_HUB_MIN_MEMBERS,
} from "@/utils/constants/graph";
import { slugOf, tagRows } from "./rows";
import type { TagLayerPayload } from "../types";

/**
 * The lazily-loaded tag layer (GET /api/graph/tags). Hubs ship bounded in SQL
 * (a stress seed with per-contact-unique tags proved distinct-tag cardinality
 * is otherwise unbounded — 940k hubs / 117MB): the HAVING floor drops hubs
 * under GRAPH_TAG_HUB_MIN_MEMBERS, then only the `hubCap` largest survive.
 * Spoke edges ship inline only while the surviving hubs' pair count fits the
 * budget; past it the client gets hubs + truncated:true and loads spokes per
 * tag via fetchTagSpokes. `edgeBudget`/`hubCap` are injectable for tests only.
 */
export async function fetchTagLayer(
  edgeBudget: number = GRAPH_TAG_EDGE_BUDGET,
  hubCap: number = GRAPH_TAG_HUB_CAP,
): Promise<TagLayerPayload> {
  const db = await getDb();
  const rows = tagRows(db);
  const slug = slugOf(rows.tag);
  const memberCount = sql<number>`count(distinct ${rows.contactId})`;

  // COLLATE "C" picks the naming spelling by byte order — deterministic and
  // identical across hosted Postgres and PGlite, unlike locale collations.
  // count(*) over () runs after GROUP BY/HAVING but before LIMIT, so every
  // row carries the true floor-surviving hub total without a second query.
  const hubRows = await db
    .select({
      slug: slug.as("slug"),
      label: sql<string>`min(${rows.tag} collate "C")`,
      memberCount: sql<number>`${memberCount}::int`,
      totalHubs: sql<number>`count(*) over ()::int`,
    })
    .from(rows)
    .where(ne(slug, ""))
    .groupBy(slug)
    .having(gte(memberCount, GRAPH_TAG_HUB_MIN_MEMBERS))
    .orderBy(desc(memberCount), asc(slug))
    .limit(hubCap);

  const hubs: TagLayerPayload["hubs"] = hubRows.map((row) => ({
    id: `tag:${row.slug}`,
    label: row.label,
    slug: row.slug,
    memberCount: row.memberCount,
  }));
  const totalHubs = hubRows[0]?.totalHubs ?? 0;
  const hubsTruncated = hubRows.length < totalHubs;
  // Pairs over SURVIVING hubs only — pairs behind a floored/capped hub never
  // ship, so they must not veto the inline-spokes path.
  const totalPairs = hubRows.reduce((sum, row) => sum + row.memberCount, 0);
  const bounds = { totalPairs, hubsTruncated, totalHubs };
  if (totalPairs > edgeBudget) return { hubs, edges: [], truncated: true, ...bounds };

  // The same floor + cap as the hub query, joined in SQL so only surviving
  // hubs' pairs are pulled — pairs never materialise unbounded in JS. The
  // nested alias differs from `rows` so the two expansions can't collide.
  const survivorRows = tagRows(db, "survivor_tag_rows");
  const survivorSlug = slugOf(survivorRows.tag);
  const survivorCount = sql<number>`count(distinct ${survivorRows.contactId})`;
  const survivors = db
    .select({ slug: survivorSlug.as("slug") })
    .from(survivorRows)
    .where(ne(survivorSlug, ""))
    .groupBy(survivorSlug)
    .having(gte(survivorCount, GRAPH_TAG_HUB_MIN_MEMBERS))
    .orderBy(desc(survivorCount), asc(survivorSlug))
    .limit(hubCap)
    .as("surviving_hubs");

  // DISTINCT dedupes per-contact spellings that slugify identically, so edge
  // ids stay unique graph keys (same rule the JS builder used).
  const pairRows = await db
    .selectDistinct({ contactId: rows.contactId, slug: slug.as("slug") })
    .from(rows)
    .innerJoin(survivors, eq(slug, survivors.slug))
    .orderBy(slug, asc(rows.contactId));

  return {
    hubs,
    edges: pairRows.map((row) => ({
      id: `tagged:${row.slug}:${row.contactId}`,
      source: row.contactId,
      target: `tag:${row.slug}`,
    })),
    truncated: false,
    ...bounds,
  };
}
