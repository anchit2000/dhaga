import type { NoteKind } from "@/lib/repo/notes";
import { saveNoteWithFacts } from "../note-write";
import type { WalkState } from "../walk-state";

/** Where a piece of ingested text ended up, so the caller can attach the
 *  artifact it was read off (currently a photo) to the same contact and note. */
export interface IngestedNote {
  contactId: string;
  /** null when the contact was created from a body that was empty, or when the
   *  note is parked on a confirmation rather than written yet. */
  noteId: string | null;
}

/** A note read off a photo is what a CAMERA saw; every other kind is the
 *  sender's own words. Only the latter can be an instruction to us — a
 *  whiteboard that happens to read "create a new contact" is still content. */
export function isSenderAuthored(kind: NoteKind): boolean {
  return kind !== "photo";
}

/**
 * Save text as a note on a contact and count it. Attribution is deliberately
 * NOT recorded here: only the caller knows *why* this contact was chosen, and
 * that reason is the whole point of the attribution (../walk-state).
 */
export async function attachNote(
  state: WalkState,
  contactId: string,
  contactName: string,
  body: string,
  kind: NoteKind,
): Promise<IngestedNote> {
  state.noteCount += 1;
  const { noteId, factCount } = await saveNoteWithFacts({
    userId: state.userId,
    contactId,
    contactName,
    kind,
    body,
  });
  state.factCount += factCount;
  return { contactId, noteId };
}
