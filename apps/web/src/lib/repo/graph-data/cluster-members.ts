import { and, count, eq, ilike, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges } from "@/lib/db/schema";
import { GRAPH_CLUSTER_CONTACT_CAP } from "@/utils/constants/graph";
import {
  OTHER_TAG_KEY,
  UNASSIGNED_KEY,
  UNKNOWN_LOCATION_KEY,
  type ClusterDimension,
  type ClusterMembersResult,
  type GraphViewEdge,
  type GraphViewNode,
} from "./types";

function scopeFilter(dimension: ClusterDimension, key: string): SQL {
  if (dimension === "company") {
    return key === UNASSIGNED_KEY ? isNull(contacts.companyId) : eq(contacts.companyId, key);
  }
  if (dimension === "tag") {
    return key === OTHER_TAG_KEY
      ? sql`${contacts.tags} = '[]'::jsonb`
      : sql`${contacts.tags} @> ${JSON.stringify([key])}::jsonb`;
  }
  return key === UNKNOWN_LOCATION_KEY ? isNull(contacts.location) : eq(contacts.location, key);
}

/**
 * Level-1 "drill into a cluster" — fetches one cluster's contacts, capped
 * (GRAPH_CLUSTER_CONTACT_CAP + 1 rows so "is it truncated" is free in the
 * common case), plus edges connecting nodes already loaded on the canvas.
 * Bounded by the cap and `loadedIds.length`, never by total graph size.
 */
export async function fetchClusterMembers(
  dimension: ClusterDimension,
  key: string,
  opts: { search?: string; loadedIds?: string[] } = {},
): Promise<ClusterMembersResult> {
  const db = await getDb();
  const like = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
  const scope = scopeFilter(dimension, key);
  const where = like ? and(scope, ilike(contacts.name, like)) : scope;

  const rows = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .where(where)
    .orderBy(contacts.name)
    .limit(GRAPH_CLUSTER_CONTACT_CAP + 1);

  const truncated = rows.length > GRAPH_CLUSTER_CONTACT_CAP;
  const pageRows = truncated ? rows.slice(0, GRAPH_CLUSTER_CONTACT_CAP) : rows;
  const totalCount = truncated
    ? (await db.select({ n: count() }).from(contacts).where(where))[0].n
    : pageRows.length;

  const nodes: GraphViewNode[] = pageRows.map((row) => ({
    id: row.id,
    kind: "contact",
    label: row.name,
    sublabel: row.title,
  }));

  const candidateIds = [...new Set([...pageRows.map((row) => row.id), ...(opts.loadedIds ?? [])])];
  const edgeRows = candidateIds.length
    ? await db
        .select()
        .from(edges)
        .where(
          and(isNull(edges.deletedAt), inArray(edges.srcId, candidateIds), inArray(edges.dstId, candidateIds)),
        )
    : [];
  const viewEdges: GraphViewEdge[] = edgeRows.map((edge) => ({
    id: edge.id,
    source: edge.srcId,
    target: edge.dstId,
    label: edge.predicate.replaceAll("_", " "),
  }));

  return { nodes, edges: viewEdges, totalCount, truncated };
}
