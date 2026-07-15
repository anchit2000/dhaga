import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { humanizePredicate } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges } from "@/lib/db/schema";
import type { GraphViewEdge, GraphViewNode } from "./types";

export interface ContactRelationshipGraph {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

/**
 * A focused contact's direct person-to-person relationship edges plus the
 * neighbour contacts they point at, so the graph can draw the interpersonal
 * links (e.g. Ajay --parent of--> Anchit) even when the two people live in
 * different company clusters. Company edges are left to cluster membership.
 */
export async function fetchContactRelationshipGraph(
  contactId: string,
): Promise<ContactRelationshipGraph> {
  const db = await getDb();
  const edgeRows = await db
    .select()
    .from(edges)
    .where(
      and(
        isNull(edges.deletedAt),
        or(
          and(eq(edges.srcId, contactId), eq(edges.dstType, "person")),
          and(eq(edges.dstId, contactId), eq(edges.srcType, "contact")),
        ),
      ),
    );
  if (edgeRows.length === 0) return { nodes: [], edges: [] };

  const neighbourIds = [
    ...new Set(
      edgeRows
        .map((edge) => (edge.srcId === contactId ? edge.dstId : edge.srcId))
        .filter((id) => id !== contactId),
    ),
  ];
  const neighbourRows = neighbourIds.length
    ? await db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title })
        .from(contacts)
        .where(inArray(contacts.id, neighbourIds))
    : [];
  const known = new Set(neighbourRows.map((row) => row.id));

  const nodes: GraphViewNode[] = neighbourRows.map((row) => ({
    id: row.id,
    kind: "contact",
    label: row.name,
    sublabel: row.title,
  }));
  const viewEdges: GraphViewEdge[] = edgeRows
    .filter((edge) => known.has(edge.srcId === contactId ? edge.dstId : edge.srcId))
    .map((edge) => ({
      id: edge.id,
      source: edge.srcId,
      target: edge.dstId,
      label: humanizePredicate(edge.predicate),
    }));
  return { nodes, edges: viewEdges };
}
