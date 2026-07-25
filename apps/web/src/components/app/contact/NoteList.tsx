import {
  deleteEntityNoteAction,
  deleteNoteAction,
  reprocessNoteAction,
} from "@/lib/actions/notes";
import type { NoteRow } from "@/lib/db/schema";
import { REPROCESSABLE_NOTE_KINDS } from "@/utils/constants/extraction-jobs";
import { formatDateTime } from "@/utils/format-date";
import { DeleteButton } from "./DeleteButton";
import { ReprocessButton } from "./ReprocessButton";

const KIND_LABELS: Record<string, string> = {
  text: "note",
  voice: "voice note",
  capture_source: "capture source",
  enrichment: "web enrichment",
};

/** Owned by exactly one of a contact or an entity — mirrors notes.contact_id/entity_id. */
type NoteListProps = { notes: NoteRow[] } & (
  | { contactId: string; entityId?: never }
  | { entityId: string; contactId?: never }
);

export function NoteList({ contactId, entityId, notes }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="text-sm text-fog">No notes yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li
          key={note.id}
          className="flex items-start gap-2 rounded-xl border border-seam bg-panel p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper/90">
              {note.body}
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-fog/60">
              {KIND_LABELS[note.kind] ?? note.kind} ·{" "}
              {formatDateTime(note.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {contactId &&
              (REPROCESSABLE_NOTE_KINDS as readonly string[]).includes(note.kind) && (
                <form action={reprocessNoteAction}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <input type="hidden" name="contactId" value={contactId} />
                  <ReprocessButton />
                </form>
              )}
            <form action={contactId ? deleteNoteAction : deleteEntityNoteAction}>
              <input type="hidden" name="noteId" value={note.id} />
              {contactId ? (
                <input type="hidden" name="contactId" value={contactId} />
              ) : (
                <input type="hidden" name="entityId" value={entityId} />
              )}
              <DeleteButton
                label={
                  contactId
                    ? "Delete note (removes its derived facts too)"
                    : "Delete note"
                }
              />
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
