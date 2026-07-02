import { randomUUID } from "node:crypto";
import { eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contacts, edges, facts, followUps } from "@/lib/db/schema";
import { findOrCreateCompany } from "./contacts";
import type { NoteExtraction, Relationship } from "@dhaga/core";

async function resolvePersonId(name: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.name, name.trim()))
    .limit(1);
  return row?.id ?? null;
}

function relationshipAsFactText(rel: Relationship): string {
  return `${rel.predicate.replaceAll("_", " ")} ${rel.object}`;
}

/**
 * Write one note's extraction into the graph. Every row carries
 * source_note_id — deleting the note tombstones all of this.
 * Person relationships only become edges when the person already exists as
 * a contact; otherwise the information is kept as a fact (no phantom
 * contacts appearing in the user's list).
 */
export async function applyExtraction(
  contactId: string,
  noteId: string,
  extraction: NoteExtraction,
): Promise<void> {
  const db = await getDb();

  for (const fact of extraction.facts) {
    await db.insert(facts).values({
      id: randomUUID(),
      contactId,
      type: fact.type,
      text: fact.text,
      confidence: fact.confidence,
      sourceNoteId: noteId,
    });
  }

  for (const rel of extraction.relationships) {
    const srcId =
      rel.subject.toLowerCase() === "contact"
        ? contactId
        : ((await resolvePersonId(rel.subject)) ?? contactId);
    const dstId =
      rel.object_type === "company"
        ? await findOrCreateCompany(rel.object)
        : await resolvePersonId(rel.object);

    if (dstId) {
      await db.insert(edges).values({
        id: randomUUID(),
        srcType: "contact",
        srcId,
        predicate: rel.predicate,
        dstType: rel.object_type,
        dstId,
        sourceNoteId: noteId,
      });
    } else {
      await db.insert(facts).values({
        id: randomUUID(),
        contactId,
        type: "personal",
        text: relationshipAsFactText(rel),
        confidence: 0.7,
        sourceNoteId: noteId,
      });
    }
  }

  for (const followUp of extraction.follow_ups) {
    await db.insert(followUps).values({
      id: randomUUID(),
      contactId,
      action: followUp.action,
      dueHint: followUp.due_hint,
      status: "open",
      sourceNoteId: noteId,
    });
  }

  if (extraction.tags.length > 0) {
    const [row] = await db
      .select({ tags: contacts.tags })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    const merged = [...new Set([...(row?.tags ?? []), ...extraction.tags])];
    await db.update(contacts).set({ tags: merged }).where(eq(contacts.id, contactId));
  }
}
