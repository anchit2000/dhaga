import { withUserDb } from "@/lib/db/request-scope";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { addNote, type NoteKind } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";

/**
 * The note writes the batch apply step ends in, in ONE place, so the sequence
 * (row → embedding → fact extraction) is not repeated at each call site.
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

