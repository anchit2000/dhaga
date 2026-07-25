import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Relationship } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, edgeSuggestions } from "@/lib/db/schema";
// Deep import (the leaf create module, not the barrel) so graph doesn't pull
// confirmations' apply.ts back into itself — mirrors how confirmations/apply.ts
// deep-imports graph/apply-extraction to avoid the same cycle.
import {
  createEntityLinkConfirmation,
  createSubjectResolutionConfirmation,
} from "@/lib/repo/confirmations/create";
import { resolveObject, resolveSubject, subjectOptions } from "./resolvers";

export interface RelationshipRows {
  edgeRows: (typeof edges.$inferInsert)[];
  /** Retained for coexistence with the legacy edge_suggestions table; no longer
   *  populated — ambiguous links now become confirmations (below). */
  suggestionRows: (typeof edgeSuggestions.$inferInsert)[];
}

/**
 * Turn one extraction's relationships into edge inserts (link now) and, for
 * anything ambiguous, pending confirmations (edges/subjects the user resolves
 * later) — all receipt-linked to the note. Ambiguous links no longer write
 * edge_suggestions rows; the confident auto-apply path is unchanged.
 *
 * - Confident subject + concrete object → an edge now (exactly as today).
 * - Confident subject + ambiguous object → an entity_link confirmation.
 * - Ambiguous subject + concrete object → a subject_resolution confirmation.
 * - Both ambiguous → an entity_link anchored to the note's contact; the
 *   single-axis confirmations can't express dual ambiguity (see report).
 */
export async function buildRelationshipRows(
  contactId: string,
  noteId: string,
  relationships: Relationship[],
): Promise<RelationshipRows> {
  const edgeRows: RelationshipRows["edgeRows"] = [];
  const suggestionRows: RelationshipRows["suggestionRows"] = [];

  // The note's subject owns any bare relative/role reference ("his son"), so
  // resolveObject can relabel it as "<owner first name>'s son". Read once here
  // rather than per-relationship.
  const db = await getDb();
  const [owner] = await db
    .select({ name: contacts.name })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  const ownerName = owner?.name ?? null;

  for (const rel of relationships) {
    const subject = await resolveSubject(rel.subject, contactId);
    const object = await resolveObject(rel, ownerName);

    if (subject.kind === "confident") {
      if (object.kind === "concrete") {
        edgeRows.push({
          id: randomUUID(),
          srcType: "contact",
          srcId: subject.contactId,
          predicate: rel.predicate,
          dstType: object.dstType,
          dstId: object.dstId,
          sourceNoteId: noteId,
        });
      } else {
        await createEntityLinkConfirmation({
          srcContactId: subject.contactId,
          predicate: rel.predicate,
          objectName: rel.object,
          objectType: object.objectType,
          entityTypeHint: object.entityTypeHint,
          options: object.options,
          sourceNoteId: noteId,
        });
      }
      continue;
    }

    // Ambiguous subject: never silently collapse onto the note's own contact.
    if (object.kind === "concrete") {
      await createSubjectResolutionConfirmation({
        predicate: rel.predicate,
        dstType: object.dstType,
        dstId: object.dstId,
        objectName: rel.object,
        question: `Which contact ${rel.predicate.replace(/_/g, " ")} "${rel.object}"?`,
        options: await subjectOptions(subject.candidates, contactId),
        sourceNoteId: noteId,
        contactId,
      });
    } else {
      await createEntityLinkConfirmation({
        srcContactId: contactId,
        predicate: rel.predicate,
        objectName: rel.object,
        objectType: object.objectType,
        entityTypeHint: object.entityTypeHint,
        options: object.options,
        sourceNoteId: noteId,
      });
    }
  }

  return { edgeRows, suggestionRows };
}
