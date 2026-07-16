import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { notes, type NoteRow } from "@/lib/db/schema";

/**
 * Plain notes attached to a custom entity (notes.entity_id). Deliberately
 * minimal next to the contact-note path: no extraction job, no embeddings —
 * entity notes are the user's own words about a place/thing, and AI
 * derivation for them is a separate feature (extraction integration), not a
 * side effect of saving. Deletion reuses deleteNote (repo/notes.ts): its
 * derived-row tombstones are no-ops here, and the embeddings/card-image
 * cleanup is keyed by note id, so one delete path serves both owners.
 */
export async function listEntityNotes(entityId: string): Promise<NoteRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.entityId, entityId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.createdAt));
}

export async function addEntityNote(entityId: string, body: string): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(notes).values({ id, entityId, kind: "text", body });
  return id;
}
