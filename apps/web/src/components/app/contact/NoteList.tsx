import { deleteNoteAction } from "@/lib/actions/notes";
import type { NoteRow } from "@/lib/db/schema";
import { DeleteButton } from "./DeleteButton";

const KIND_LABELS: Record<string, string> = {
  text: "note",
  voice: "voice note",
  capture_source: "capture source",
};

export function NoteList({
  contactId,
  notes,
}: {
  contactId: string;
  notes: NoteRow[];
}) {
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
          <form action={deleteNoteAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <input type="hidden" name="contactId" value={contactId} />
            <DeleteButton label="Delete note (removes its derived facts too)" />
          </form>
        </li>
      ))}
    </ul>
  );
}
