import { randomUUID } from "node:crypto";
import { ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, edgeSuggestions } from "@/lib/db/schema";
import { findOrCreateCompany } from "../contacts";
import { resolveEntityObject, resolvePersonObject } from "../edge-suggestions";
import type { Relationship } from "@dhaga/core";

export interface RelationshipRows {
  edgeRows: (typeof edges.$inferInsert)[];
  suggestionRows: (typeof edgeSuggestions.$inferInsert)[];
}

async function resolvePersonId(name: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.name, name.trim()))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Turn one extraction's relationships into edge inserts (link now) and
 * edge_suggestions inserts (defer to the user), all receipt-linked to the note.
 *
 * - company objects: find-or-create, always an edge.
 * - person objects: an unambiguous new person becomes a lightweight
 *   `mentioned` contact and is linked immediately; an ambiguous one (a name
 *   matching more than one contact, or only fuzzily) is held as a suggestion.
 * - entity objects (the user's custom node types): only a unique exact name
 *   match links immediately. Everything else — ambiguous, fuzzy, or unknown —
 *   is held as a suggestion carrying the extractor's node-type hint, because
 *   creating an entity needs a node type only the user can pick.
 */
export async function buildRelationshipRows(
  contactId: string,
  noteId: string,
  relationships: Relationship[],
): Promise<RelationshipRows> {
  const edgeRows: RelationshipRows["edgeRows"] = [];
  const suggestionRows: RelationshipRows["suggestionRows"] = [];

  for (const rel of relationships) {
    const srcId =
      rel.subject.toLowerCase() === "contact"
        ? contactId
        : ((await resolvePersonId(rel.subject)) ?? contactId);

    if (rel.object_type === "company") {
      edgeRows.push({
        id: randomUUID(),
        srcType: "contact",
        srcId,
        predicate: rel.predicate,
        dstType: "company",
        dstId: await findOrCreateCompany(rel.object),
        sourceNoteId: noteId,
      });
      continue;
    }

    if (rel.object_type === "entity") {
      const resolution = await resolveEntityObject(rel.object);
      if (resolution.kind === "edge") {
        edgeRows.push({
          id: randomUUID(),
          srcType: "contact",
          srcId,
          predicate: rel.predicate,
          dstType: "entity",
          dstId: resolution.dstId,
          sourceNoteId: noteId,
        });
      } else {
        suggestionRows.push({
          id: randomUUID(),
          srcContactId: srcId,
          predicate: rel.predicate,
          objectName: rel.object,
          objectType: "entity",
          entityTypeHint: rel.entity_type_hint,
          candidateIds: resolution.candidateIds,
          sourceNoteId: noteId,
        });
      }
      continue;
    }

    // A person on the other end: link immediately when unambiguous, otherwise
    // hold it as a suggestion for the user to confirm which contact is meant.
    const resolution = await resolvePersonObject(rel.object);
    if (resolution.kind === "edge") {
      edgeRows.push({
        id: randomUUID(),
        srcType: "contact",
        srcId,
        predicate: rel.predicate,
        dstType: "contact",
        dstId: resolution.dstId,
        sourceNoteId: noteId,
      });
    } else {
      suggestionRows.push({
        id: randomUUID(),
        srcContactId: srcId,
        predicate: rel.predicate,
        objectName: rel.object,
        objectType: "person",
        candidateIds: resolution.candidateIds,
        sourceNoteId: noteId,
      });
    }
  }

  return { edgeRows, suggestionRows };
}
