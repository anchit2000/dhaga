"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { mutation, MutationError } from "@/lib/actions/mutation";
import { getContact } from "@/lib/repo/contacts";
import { getEntity } from "@/lib/repo/entities";
import { addEntityNote } from "@/lib/repo/entity-notes";
import { addNote } from "@/lib/repo/notes";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { hasMonthlyAiBudget } from "@/lib/ai/metering";
import type { NoteFormState } from "./shared";

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
