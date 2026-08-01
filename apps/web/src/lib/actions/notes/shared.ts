import { IMMUTABLE_NOTE_KINDS } from "@/utils/constants/extraction-jobs";

export interface NoteFormState {
  notice?: string;
  error?: string;
}

/** Receipts are immutable — delete actions no-op instead of deleting them
 *  (mirrors the hidden button in NoteList). */
export function isImmutableNoteKind(kind: string): boolean {
  return (IMMUTABLE_NOTE_KINDS as readonly string[]).includes(kind);
}
