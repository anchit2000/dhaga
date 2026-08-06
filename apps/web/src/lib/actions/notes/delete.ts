"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { scheduleCalendarWriteOut } from "@/lib/calendar/write-out";
import { deleteNote, getNote } from "@/lib/repo/notes";
import { isImmutableNoteKind } from "./shared";

export async function deleteEntityNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteEntityNote", async (userId) => {
    const note = await getNote(noteId);
    // Receipts are immutable — no-op instead of deleting (mirrors the hidden button in NoteList).
    const followUpIds = note && isImmutableNoteKind(note.kind) ? [] : await deleteNote(noteId);
    return { followUpIds, userId };
  });
  if (!r.ok) throw new Error(r.error);
  for (const id of r.data.followUpIds) scheduleCalendarWriteOut(r.data.userId, id);
  revalidatePath(`/app/entities/${entityId}`);
  revalidatePath("/app/calendar");
  revalidatePath("/app/tasks");
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteNote", async (userId) => {
    const note = await getNote(noteId);
    // Receipts are immutable — no-op instead of deleting (mirrors the hidden button in NoteList).
    const followUpIds = note && isImmutableNoteKind(note.kind) ? [] : await deleteNote(noteId);
    return { followUpIds, userId };
  });
  if (!r.ok) throw new Error(r.error);
  for (const id of r.data.followUpIds) scheduleCalendarWriteOut(r.data.userId, id);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  revalidatePath("/app/calendar");
  revalidatePath("/app/follow-ups");
  revalidatePath("/app/tasks");
}
