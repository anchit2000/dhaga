"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import {
  addNote,
  deleteFact,
  deleteNote,
  setFollowUpStatus,
  updateFactText,
  verifyFact,
} from "@/lib/repo/notes";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { upsertEmbedding } from "@/lib/repo/embeddings";

export interface NoteFormState {
  notice?: string;
  error?: string;
}

/**
 * Persist the note and return immediately — the (slow) LLM extraction is a
 * background job the page polls for. This is what lets the user fire off
 * several notes in a row without each submit blocking on Haiku, and it's why
 * the request can no longer time out with the note "lost" until a refresh.
 */
export async function addNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!contactId) return { error: "Missing contact." };
  if (!body) return { error: "Write something first." };

  const detail = await getContact(contactId);
  if (!detail) return { error: "Contact not found." };

  const kind = formData.get("kind") === "voice" ? "voice" : "text";
  const noteId = await addNote(contactId, kind, body);
  await createExtractionJob({ contactId, kind: "note_extraction", noteId });
  revalidatePath(`/app/people/${contactId}`);
  return { notice: "Note saved — extracting facts…" };
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

/** Confirm a web-sourced (unverified) fact, clearing its badge. */
export async function verifyFactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  await verifyFact(factId);
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
