import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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

/** Tombstone, matching how note deletion retires derived edges. */
export async function deleteRelationshipEdge(edgeId: string): Promise<void> {
  const db = await getDb();
  await db.update(edges).set({ deletedAt: new Date() }).where(eq(edges.id, edgeId));
}
