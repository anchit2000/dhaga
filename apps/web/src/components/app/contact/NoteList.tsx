import { deleteEntityNoteAction, deleteNoteAction } from "@/lib/actions/notes";
import type { NoteRow } from "@/lib/db/schema";
import { DeleteButton } from "./DeleteButton";

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
              {note.createdAt.toLocaleString()}
            </p>
          </div>
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
        </li>
      ))}
    </ul>
  );
}
