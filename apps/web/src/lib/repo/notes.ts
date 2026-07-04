import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import {
  edges,
  facts,
  followUps,
  notes,
  type FactRow,
  type FollowUpRow,
  type NoteRow,
} from "@/lib/db/schema";
import { deleteCardImagesByNote } from "./card-images";

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

/**
 * Tombstone a note and everything derived from it. Receipts invariant:
 * facts/edges must never outlive their source note (BRD §7.4). A stored
 * card photo hangs off its receipt note, so it goes too (hard delete —
 * photos never linger as tombstones).
 */
export async function deleteNote(noteId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.update(notes).set({ deletedAt: now }).where(eq(notes.id, noteId));
  await db.update(facts).set({ deletedAt: now }).where(eq(facts.sourceNoteId, noteId));
  await db.update(edges).set({ deletedAt: now }).where(eq(edges.sourceNoteId, noteId));
  await deleteCardImagesByNote(noteId);
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

export async function deleteFact(factId: string): Promise<void> {
  const db = await getDb();
  await db.update(facts).set({ deletedAt: new Date() }).where(eq(facts.id, factId));
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
