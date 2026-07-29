import { eq } from "drizzle-orm";
import type { NoteExtraction, Relationship } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges, positions, type PositionRow } from "@/lib/db/schema";

/** A relationship with the affiliation fields the extractor fills; the rest
 *  default to "the model said nothing", which is the common shape. */
export function rel(
  partial: Partial<Relationship> & Pick<Relationship, "predicate" | "object">,
): Relationship {
  return {
    subject: "contact",
    object_type: "company",
    entity_type_hint: null,
    object_is_named: null,
    role_title: null,
    is_current: null,
    started_at: null,
    ended_at: null,
    ...partial,
  };
}

export function extractionOf(relationships: Relationship[]): NoteExtraction {
  return { facts: [], relationships, follow_ups: [], tags: [] };
}

export async function positionsOf(contactId: string): Promise<PositionRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(positions)
    .where(eq(positions.contactId, contactId))
    .orderBy(positions.sortOrder);
}

export async function noteEdgePredicates(noteId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ predicate: edges.predicate })
    .from(edges)
    .where(eq(edges.sourceNoteId, noteId));
  return rows.map((row) => row.predicate);
}
