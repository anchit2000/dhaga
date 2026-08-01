"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { deleteNote, getNote } from "@/lib/repo/notes";
import { isImmutableNoteKind } from "./shared";

export async function deleteEntityNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteEntityNote", async () => {
    const note = await getNote(noteId);
    // Receipts are immutable — no-op instead of deleting (mirrors the hidden button in NoteList).
    if (note && isImmutableNoteKind(note.kind)) return;
    await deleteNote(noteId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/entities/${entityId}`);
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteNote", async () => {
    const note = await getNote(noteId);
    // Receipts are immutable — no-op instead of deleting (mirrors the hidden button in NoteList).
    if (note && isImmutableNoteKind(note.kind)) return;
    await deleteNote(noteId);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}
