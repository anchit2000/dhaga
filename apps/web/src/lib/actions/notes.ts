"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { getContact } from "@/lib/repo/contacts";
import {
  addNote,
  deleteFact,
  deleteNote,
  setFollowUpStatus,
  updateFactText,
} from "@/lib/repo/notes";
import { deleteEmbedding, upsertEmbedding } from "@/lib/repo/embeddings";

export interface NoteFormState {
  notice?: string;
  error?: string;
}

export async function addNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!contactId) return { error: "Missing contact." };
  if (!body) return { error: "Write something first." };

  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };

  const kind = formData.get("kind") === "voice" ? "voice" : "text";
  const noteId = await addNote(contactId, kind, body);
  await upsertEmbedding("note", noteId, contactId, body);
  const outcome = await extractAndApplyNote(
    userId,
    contactId,
    noteId,
    detail.contact.name,
    body,
  );
  revalidatePath(`/app/people/${contactId}`);
  return {
    notice: outcome.applied
      ? `Note saved — ${outcome.factCount} fact${outcome.factCount === 1 ? "" : "s"} and ${outcome.followUpCount} follow-up${outcome.followUpCount === 1 ? "" : "s"} extracted.`
      : outcome.notice,
  };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  await requireUserId();
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId) return;
  await deleteNote(noteId);
  revalidatePath(`/app/people/${contactId}`);
}

export async function deleteFactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  await deleteEmbedding("fact", factId);
  await deleteFact(factId);
  revalidatePath(`/app/people/${contactId}`);
}

export async function updateFactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!factId || !text) return;
  await updateFactText(factId, text);
  await upsertEmbedding("fact", factId, contactId, text);
  revalidatePath(`/app/people/${contactId}`);
}

export async function completeFollowUpAction(formData: FormData): Promise<void> {
  await requireUserId();
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!followUpId) return;
  await setFollowUpStatus(followUpId, "done");
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}
