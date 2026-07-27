import { withUserDb } from "@/lib/db/request-scope";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { createContact } from "@/lib/repo/contacts";
import { addNote, type NoteKind } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { setCurrentContact, type WalkState } from "./walk-state";

/**
 * Establish-or-attach for a piece of free text (a forwarded note, or a
 * transcribed voice note). If there is no current contact yet, the text is
 * parsed into a NEW contact (its capture_source receipt); otherwise it is
 * attached as a note to the current contact. Either way the note is run through
 * fact extraction, exactly as the background extraction worker does.
 *
 * Connection discipline (project rule): every LLM/network call
 * (extractContactFromText, extractAndApplyNote) runs OUTSIDE any withUserDb
 * scope — those self-scope their own short DB phases around the model call — and
 * only the synchronous DB writes below sit inside a short withUserDb. No tenant
 * connection is ever held across a model round-trip.
 */
export async function ingestText(
  state: WalkState,
  text: string,
  establishKind: NoteKind,
  attachKind: NoteKind,
): Promise<void> {
  if (text.trim().length === 0) return;
  const { userId } = state;

  if (state.currentContactId == null) {
    // ESTABLISH: text → contact. LLM (or offline heuristic) parse first, no
    // connection held across it.
    const extracted = await extractContactFromText(userId, text);
    const contactName = extracted.contact.name;
    const { contactId, noteId } = await withUserDb(userId, async () => {
      const id = await createContact(extracted.contact, "messaging");
      const note = await addNote(id, establishKind, text);
      await upsertEmbedding("note", note, id, text);
      return { contactId: id, noteId: note };
    });
    setCurrentContact(state, contactId, contactName);
    const outcome = await extractAndApplyNote(userId, contactId, noteId, contactName, text, "note");
    state.factCount += outcome.factCount;
    return;
  }

  // ATTACH: note on the current contact.
  const contactId = state.currentContactId;
  const contactName = state.currentContactName ?? "";
  const noteId = await withUserDb(userId, async () => {
    const note = await addNote(contactId, attachKind, text);
    await upsertEmbedding("note", note, contactId, text);
    return note;
  });
  state.noteCount += 1;
  const outcome = await extractAndApplyNote(userId, contactId, noteId, contactName, text, "note");
  state.factCount += outcome.factCount;
}
