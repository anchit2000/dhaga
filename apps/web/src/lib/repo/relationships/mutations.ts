import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import {
  PREDICATE_SLUG_PATTERN,
  RELATIONSHIP_ENDPOINT_KINDS,
} from "@/utils/constants/graph";

export type RelationshipEndpointKind = (typeof RELATIONSHIP_ENDPOINT_KINDS)[number];

export interface RelationshipInput {
  srcId: string;
  srcKind: RelationshipEndpointKind;
  dstId: string;
  dstKind: RelationshipEndpointKind;
  predicate: string;
}

/** Pure validation (no DB) so the create action and tests share one gate.
 *  Returns a user-facing error, or null when the input is writable. */
export function validateRelationshipInput(input: RelationshipInput): string | null {
  const kinds: readonly string[] = RELATIONSHIP_ENDPOINT_KINDS;
  if (!input.srcId?.trim() || !input.dstId?.trim()) {
    return "Both endpoints are required.";
  }
  if (!kinds.includes(input.srcKind) || !kinds.includes(input.dstKind)) {
    return "Unknown node kind.";
  }
  if (input.srcId === input.dstId) {
    return "A relationship needs two different nodes.";
  }
  if (!PREDICATE_SLUG_PATTERN.test(input.predicate)) {
    return "Predicate must be a snake_case slug (e.g. father_of).";
  }
  return null;
}

/** Manual edges carry no receipt — source_note_id stays NULL, so deleting any
 *  note never tombstones a relationship the user created by hand. */
export async function createRelationshipEdge(input: RelationshipInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(edges).values({
    id,
    srcType: input.srcKind,
    srcId: input.srcId,
    predicate: input.predicate,
    dstType: input.dstKind,
    dstId: input.dstId,
    sourceNoteId: null,
  });
  return id;
}

/** Where an edge pointed BEFORE an edit — the caller has to revalidate the
 *  pages it left as well as the ones it now joins. Kinds stay plain strings
 *  because they are read back off a stored row, where legacy values can live. */
export interface RelationshipEndpoints {
  srcKind: string;
  srcId: string;
  dstKind: string;
  dstId: string;
}

/**
 * Repoint an existing edge: any of its predicate, its direction, or the node
 * at the other end. The caller sends the whole desired edge rather than a diff
 * — direction is not a column (an edge reads "father of" one way and "child
 * of" the other), so a flip and a swapped endpoint are the same write, and
 * `validateRelationshipInput` gates both the same way it gates a create.
 *
 * In place, not delete-and-recreate, so the edge keeps its id and its
 * `source_note_id` receipt — correcting a mislabelled extracted relationship
 * must not sever it from the note it came from. Returns the pre-edit endpoints,
 * or null when the edge is already gone (deleted in another tab), so the caller
 * can say so instead of reporting a phantom success.
 */
export async function updateRelationshipEdge(
  edgeId: string,
  next: RelationshipInput,
): Promise<RelationshipEndpoints | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      srcType: edges.srcType,
      srcId: edges.srcId,
      dstType: edges.dstType,
      dstId: edges.dstId,
    })
    .from(edges)
    .where(and(eq(edges.id, edgeId), isNull(edges.deletedAt)));
  if (!row) return null;
  await db
    .update(edges)
    .set({
      predicate: next.predicate,
      srcType: next.srcKind,
      srcId: next.srcId,
      dstType: next.dstKind,
      dstId: next.dstId,
    })
    .where(eq(edges.id, edgeId));
  return {
    srcKind: row.srcType,
    srcId: row.srcId,
    dstKind: row.dstType,
    dstId: row.dstId,
  };
}

/** Tombstone, matching how note deletion retires derived edges. */
export async function deleteRelationshipEdge(edgeId: string): Promise<void> {
  const db = await getDb();
  await db.update(edges).set({ deletedAt: new Date() }).where(eq(edges.id, edgeId));
}
