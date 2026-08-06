import type { ExtractedContact } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { createContact } from "@/lib/repo/contacts";
import { addNote, type NoteKind } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";

/**
 * The three writes every inbound path ends in, in ONE place — the batch walk
 * (./ingest-text, ./process-item) and the answer-a-question path (./answer)
 * both go through here rather than each repeating the sequence.
 *
 * Connection discipline (project rule, #92): DB work sits inside a SHORT
 * withUserDb scope and the LLM call happens AFTER it releases. No tenant
 * connection is ever held across a model round-trip.
 */

/** Note + its embedding, in one short tenant scope. Returns the note id. */
export async function saveNote(
  userId: string,
  contactId: string,
  kind: NoteKind,
  body: string,
): Promise<string> {
  return withUserDb(userId, async () => {
    const noteId = await addNote(contactId, kind, body);
    await upsertEmbedding("note", noteId, contactId, body);
    return noteId;
  });
}

/** Run fact extraction on a stored note (no DB scope held). Returns the fact count. */
export async function extractNoteFacts(input: {
  userId: string;
  contactId: string;
  noteId: string;
  contactName: string;
  body: string;
}): Promise<number> {
  const outcome = await extractAndApplyNote(
    input.userId,
    input.contactId,
    input.noteId,
    input.contactName,
    input.body,
    "note",
  );
  return outcome.factCount;
}

/** saveNote, then fact extraction outside the scope. Returns the stored note's
 *  id alongside the fact count — the id is what lets a caller hang the photo
 *  the note was read off onto the note itself, so deleting the note takes the
 *  photo with it (../repo/card-images: photo deletes are always hard). */
export async function saveNoteWithFacts(input: {
  userId: string;
  contactId: string;
  contactName: string;
  kind: NoteKind;
  body: string;
}): Promise<{ noteId: string; factCount: number }> {
  const noteId = await saveNote(input.userId, input.contactId, input.kind, input.body);
  return { noteId, factCount: await extractNoteFacts({ ...input, noteId }) };
}

/** Create a contact and give it its first receipt note (the item's receipt). */
export async function createContactWithNote(
  userId: string,
  contact: ExtractedContact,
  kind: NoteKind,
  body: string,
): Promise<{ contactId: string; noteId: string | null }> {
  const contactId = await withUserDb(userId, () => createContact(contact, "messaging"));
  const noteId = body.trim().length > 0 ? await saveNote(userId, contactId, kind, body) : null;
  return { contactId, noteId };
}
