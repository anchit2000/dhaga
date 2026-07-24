"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { getEntity } from "@/lib/repo/entities";
import { addEntityNote } from "@/lib/repo/entity-notes";
import {
  addNote,
  deleteFact,
  deleteNote,
  getNote,
  setFollowUpStatus,
  updateFactText,
  verifyFact,
} from "@/lib/repo/notes";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { REPROCESSABLE_NOTE_KINDS } from "@/utils/constants/extraction-jobs";

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

/**
 * Manually re-run extraction on an existing note — for after the user edits a
 * note or the first pass missed a fact. Enqueues a fresh note_extraction job
 * for the SAME note and returns immediately; the person page's poller fires the
 * worker exactly as for a new note. The worker clears the note's prior
 * derivations (clearNoteDerivations) before re-extracting, so a re-run REPLACES
 * this note's facts/edges/follow-ups instead of duplicating them. This reuses
 * the whole background pipeline — the per-user AI budget is still enforced
 * downstream in the worker (assertAiBudget), so re-processing never bypasses
 * metering.
 */
export async function reprocessNoteAction(formData: FormData): Promise<void> {
  await requireUserId();
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId || !contactId) return;
  // RLS scopes getNote to this user; a note they don't own reads back null.
  const note = await getNote(noteId);
  if (!note || note.contactId !== contactId) return;
  // Only trusted user captures re-extract in "note" mode (see REPROCESSABLE_NOTE_KINDS).
  if (!(REPROCESSABLE_NOTE_KINDS as readonly string[]).includes(note.kind)) return;
  await createExtractionJob({ contactId, kind: "note_extraction", noteId });
  revalidatePath(`/app/people/${contactId}`);
}

/** Entity notes save as-is — no extraction job (plain notes by design). */
export async function addEntityNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  await requireUserId();
  const entityId = String(formData.get("entityId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!entityId) return { error: "Missing entity." };
  if (!body) return { error: "Write something first." };
  if (!(await getEntity(entityId))) return { error: "Entity not found." };
  await addEntityNote(entityId, body);
  revalidatePath(`/app/entities/${entityId}`);
  return {};
}

export async function deleteEntityNoteAction(formData: FormData): Promise<void> {
  await requireUserId();
  const noteId = String(formData.get("noteId") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!noteId) return;
  await deleteNote(noteId);
  revalidatePath(`/app/entities/${entityId}`);
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
