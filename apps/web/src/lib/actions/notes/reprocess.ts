"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { getNote } from "@/lib/repo/notes";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { hasMonthlyAiBudget } from "@/lib/ai/metering";
import { REPROCESSABLE_NOTE_KINDS } from "@/utils/constants/extraction-jobs";

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
