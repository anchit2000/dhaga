import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  confirmations,
  edges,
  edgeSuggestions,
  facts,
  followUps,
  notes,
  type NoteRow,
} from "@/lib/db/schema";
import { deleteCardImagesByNote } from "@/lib/repo/card-images";
import { deleteEmbedding, deleteEmbeddingsForNote } from "@/lib/repo/embeddings";

export type NoteKind = "text" | "voice" | "capture_source" | "enrichment" | "signal";

export async function listNotes(contactId: string): Promise<NoteRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.contactId, contactId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.createdAt));
}

export async function addNote(
  contactId: string,
  kind: NoteKind,
  body: string,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(notes).values({ id, contactId, kind, body });
  return id;
}

export async function getNote(noteId: string): Promise<NoteRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), isNull(notes.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Drop everything a note previously derived (facts/edges/follow-ups and the
 * facts' embeddings), leaving the note itself. Makes a re-run of the extraction
 * worker idempotent: a retried job re-derives from scratch instead of stacking
 * a second copy of every fact. Hard delete (not tombstone) — these rows are
 * being regenerated from the same note, so there's no receipt to preserve.
 */
export async function clearNoteDerivations(noteId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const factRows = await tx
      .select({ id: facts.id })
      .from(facts)
      .where(eq(facts.sourceNoteId, noteId));
    await tx.delete(facts).where(eq(facts.sourceNoteId, noteId));
    await tx.delete(edges).where(eq(edges.sourceNoteId, noteId));
    await tx.delete(edgeSuggestions).where(eq(edgeSuggestions.sourceNoteId, noteId));
    await tx.delete(confirmations).where(and(eq(confirmations.sourceNoteId, noteId), eq(confirmations.status, "pending")));
    await tx.delete(followUps).where(eq(followUps.sourceNoteId, noteId));
    for (const row of factRows) await deleteEmbedding("fact", row.id, tx);
  });
}

/**
 * Tombstone a note and everything derived from it. Receipts invariant:
 * facts/edges must never outlive their source note (BRD §7.4). A stored
 * card photo hangs off its receipt note, so it goes too (hard delete —
 * photos never linger as tombstones). Embeddings are hard-deleted too —
 * a tombstoned note has no business surfacing in semantic search.
 *
 * Wrapped in one transaction: every statement here is a pure DB write (no
 * outbound network calls), so holding a connection open across all of them
 * is safe. Without this, a failure partway through — e.g. the facts update
 * throwing after the note is already tombstoned — could leave the note/facts
 * invisible in listNotes/listFacts (filtered on deletedAt) while their
 * embeddings survive, so deleted content stays verbatim-searchable forever
 * with no reconciliation job to catch the drift. All-or-nothing closes that.
 */
export async function deleteNote(noteId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(notes).set({ deletedAt: now }).where(eq(notes.id, noteId));
    await tx.update(facts).set({ deletedAt: now }).where(eq(facts.sourceNoteId, noteId));
    await tx.update(edges).set({ deletedAt: now }).where(eq(edges.sourceNoteId, noteId));
    // Suggestions/confirmations are pending workflow items, not receipts — a
    // deleted note's "confirm this" prompts are moot, so drop them outright.
    await tx.delete(edgeSuggestions).where(eq(edgeSuggestions.sourceNoteId, noteId));
    await tx.delete(confirmations).where(and(eq(confirmations.sourceNoteId, noteId), eq(confirmations.status, "pending")));
    await deleteCardImagesByNote(noteId, tx);
    await deleteEmbeddingsForNote(noteId, tx);
  });
}
