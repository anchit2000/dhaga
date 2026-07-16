import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  edges,
  edgeSuggestions,
  facts,
  followUps,
  notes,
  type FactRow,
  type FollowUpRow,
  type NoteRow,
} from "@/lib/db/schema";
import { deleteCardImagesByNote } from "./card-images";
import { deleteEmbedding, deleteEmbeddingsForNote } from "./embeddings";

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
    // Suggestions are pending workflow items, not receipts — a deleted note's
    // "confirm this relationship" prompts are moot, so drop them outright.
    await tx.delete(edgeSuggestions).where(eq(edgeSuggestions.sourceNoteId, noteId));
    await deleteCardImagesByNote(noteId, tx);
    await deleteEmbeddingsForNote(noteId, tx);
  });
}

export interface FactWithReceipt extends FactRow {
  noteCreatedAt: Date | null;
}

export async function listFacts(contactId: string): Promise<FactWithReceipt[]> {
  const db = await getDb();
  const rows = await db
    .select({ fact: facts, noteCreatedAt: notes.createdAt })
    .from(facts)
    .leftJoin(notes, eq(facts.sourceNoteId, notes.id))
    .where(and(eq(facts.contactId, contactId), isNull(facts.deletedAt)))
    .orderBy(desc(facts.createdAt));
  return rows.map((row) => ({ ...row.fact, noteCreatedAt: row.noteCreatedAt }));
}

export async function updateFactText(
  factId: string,
  text: string,
): Promise<void> {
  const db = await getDb();
  await db.update(facts).set({ text: text.trim() }).where(eq(facts.id, factId));
}

/** Clear the "unverified" badge once the user confirms a web-sourced fact. */
export async function verifyFact(factId: string): Promise<void> {
  const db = await getDb();
  await db.update(facts).set({ unverified: false }).where(eq(facts.id, factId));
}

/**
 * Tombstone a fact. Its embedding goes too — same receipts invariant as
 * deleteNote, and the same reason it's transactional: if the fact update
 * succeeded but deleteEmbedding threw, the fact would be gone everywhere
 * else yet still fully searchable.
 */
export async function deleteFact(factId: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(facts).set({ deletedAt: new Date() }).where(eq(facts.id, factId));
    await deleteEmbedding("fact", factId, tx);
  });
}

export async function listOpenFollowUps(contactId: string): Promise<FollowUpRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(followUps)
    .where(and(eq(followUps.contactId, contactId), eq(followUps.status, "open")))
    .orderBy(desc(followUps.createdAt));
}

export async function setFollowUpStatus(
  followUpId: string,
  status: "done" | "dismissed",
): Promise<void> {
  const db = await getDb();
  await db.update(followUps).set({ status }).where(eq(followUps.id, followUpId));
}
