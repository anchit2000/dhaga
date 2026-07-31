"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { mutation, MutationError } from "@/lib/actions/mutation";
import { getContact } from "@/lib/repo/contacts";
import { getEntity } from "@/lib/repo/entities";
import { addEntityNote } from "@/lib/repo/entity-notes";
import {
  addNote,
  deleteFact,
  deleteNote,
  getNote,
  updateFactText,
  verifyFact,
} from "@/lib/repo/notes";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { hasMonthlyAiBudget } from "@/lib/ai/metering";
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
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!contactId) return { error: "Missing contact." };
  if (!body) return { error: "Write something first." };

  const detail = await withUserDb(userId, () => getContact(contactId));
  if (!detail) return { error: "Contact not found." };

  const kind = formData.get("kind") === "voice" ? "voice" : "text";
  // Wrap the writes so a transient DB failure returns an inline error (the
  // compose box keeps the user's typed note) instead of throwing to the boundary.
  // withUserDb pins ONE scoped connection for the whole sequence: a server action
  // gets no React cache() getDb() dedupe, so each getDb() would otherwise check
  // out its own tenant-pool connection (max 3) and exhaust it under load.
  let budgeted = false;
  try {
    budgeted = await withUserDb(userId, async () => {
      const noteId = await addNote(contactId, kind, body);
      // A month whose credits are spent — free (10) or paid — has no AI budget:
      // skip enqueuing a job that would only fail, and surface a calm
      // out-of-credits notice instead of "extracting facts…". The note is still
      // saved either way.
      const hasBudget = await hasMonthlyAiBudget(userId);
      if (hasBudget) {
        await createExtractionJob({ contactId, kind: "note_extraction", noteId });
      }
      return hasBudget;
    });
  } catch (error) {
    logActionError("addNote", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  return {
    notice: budgeted
      // Says the part users can't see: the worker owns the job from here, so
      // leaving the page can't cancel it (processExtractionJob commits regardless).
      ? "Note saved — extracting facts in the background. This keeps running if you leave the page."
      : "Note saved. You're out of AI credits this month, so facts weren't extracted.",
  };
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
  const userId = await requireUserId();
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId || !contactId) return;
  // Each getDb() below runs inside a withUserDb scope pinned to one tenant-pool
  // connection — a server action gets no React cache() getDb() dedupe, so the
  // reads/insert would otherwise each check out their own connection (max 3).
  // RLS scopes getNote to this user; a note they don't own reads back null.
  const note = await withUserDb(userId, () => getNote(noteId));
  if (!note || note.contactId !== contactId) return;
  // Only trusted user captures re-extract in "note" mode (see REPROCESSABLE_NOTE_KINDS).
  if (!(REPROCESSABLE_NOTE_KINDS as readonly string[]).includes(note.kind)) return;
  // No AI budget → don't enqueue a doomed re-extraction (same guard as addNote).
  if (!(await withUserDb(userId, () => hasMonthlyAiBudget(userId)))) return;
  await withUserDb(userId, () => createExtractionJob({ contactId, kind: "note_extraction", noteId }));
  revalidatePath(`/app/people/${contactId}`);
}

/** Entity notes save as-is — no extraction job (plain notes by design). */
export async function addEntityNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const entityId = String(formData.get("entityId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!entityId) return { error: "Missing entity." };
  if (!body) return { error: "Write something first." };
  // The existence check + write share ONE scoped connection via mutation() — a
  // server action gets no React cache() getDb() dedupe, so an unscoped getEntity
  // would otherwise fan out its own tenant-pool connection (max 3).
  const r = await mutation("addEntityNote", async () => {
    if (!(await getEntity(entityId))) throw new MutationError("Entity not found.");
    await addEntityNote(entityId, body);
  });
  if (!r.ok) return { error: r.error };
  revalidatePath(`/app/entities/${entityId}`);
  return {};
}

export async function deleteEntityNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteEntityNote", () => deleteNote(noteId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/entities/${entityId}`);
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const noteId = String(formData.get("noteId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!noteId) return;
  const r = await mutation("deleteNote", () => deleteNote(noteId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}

export async function deleteFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  const r = await mutation("deleteFact", () => deleteFact(factId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}

export async function updateFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!factId || !text) return;
  // One scoped connection for the update + local-embed index (mutation() pins it):
  // a server action gets no React cache() getDb() dedupe. A transient throw is
  // caught by the caller's runAction, keeping the inline edit open with its text.
  const r = await mutation("updateFact", async () => {
    await updateFactText(factId, text);
    await upsertEmbedding("fact", factId, contactId, text);
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}

/** Confirm a web-sourced (unverified) fact, clearing its badge. */
export async function verifyFactAction(formData: FormData): Promise<void> {
  const factId = String(formData.get("factId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!factId) return;
  const r = await mutation("verifyFact", () => verifyFact(factId));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
}
