"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { readCapturePhotos } from "@/lib/actions/capture-photos";
import { composePhotoNoteBody } from "@/lib/actions/photo-note-body";
import { AiBudgetError, hasMonthlyAiBudget } from "@/lib/ai/metering";
import { transcribePhotoNote } from "@/lib/ai/photo-note";
import { saveCardImages } from "@/lib/repo/card-images";
import { getContact } from "@/lib/repo/contacts";
import { createExtractionJob } from "@/lib/repo/extraction-jobs";
import { addNote } from "@/lib/repo/notes";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import type { NoteFormState } from "@/lib/actions/notes";

/**
 * The third way to capture a note: a photo. Snap a whiteboard, a poster, a
 * handwritten page, a receipt — the photo is kept as the receipt and its text
 * becomes the note body, so from that point on it is an ordinary note (indexed,
 * searchable, extracted into facts/follow-ups by the same background job).
 *
 * Unlike addNoteAction this DOES wait on a model call, because a photo has no
 * body until it is transcribed — there is nothing to save otherwise. The call
 * is deliberately held outside every `withUserDb` scope: the tenant pool is 3
 * connections wide, and parking one across a vision round trip is the exact
 * shape of the outages in docs (see lib/ai/card-transcription.ts).
 */
export async function addPhotoNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  // The same `body` field as a typed note: a photo note may carry the user's
  // own line as well, and it must not be lost.
  const caption = String(formData.get("body") ?? "").trim();
  if (!contactId) return { error: "Missing contact." };
  const read = await readCapturePhotos(formData);
  if (!read.ok) return { error: read.error };
  if (read.images.length === 0) return { error: "Choose a photo first." };

  const detail = await withUserDb(userId, () => getContact(contactId));
  if (!detail) return { error: "Contact not found." };

  let transcribed: string | null = null;
  let budgetBlocked = false;
  try {
    transcribed = await transcribePhotoNote(userId, read.images);
  } catch (error) {
    // Out of AI budget is an expected outcome, not a fault: fall through and
    // let the user's own caption (if any) still save.
    if (!(error instanceof AiBudgetError)) {
      logActionError("addPhotoNote.transcribe", error);
      return { error: "Couldn't read that photo — try again." };
    }
    budgetBlocked = true;
  }

  const body = composePhotoNoteBody(caption, transcribed);
  if (!body) {
    return {
      error: budgetBlocked
        ? "Reading a photo is an AI action, and your AI budget is used up — type the note instead."
        : "Couldn't read any text in that photo — add a line of your own and try again.",
    };
  }

  // One scoped connection for the whole write sequence: a server action gets no
  // React cache() getDb() dedupe, so each repo call would otherwise check out
  // its own tenant-pool connection (max 3) and exhaust it under load.
  let budgeted = false;
  try {
    budgeted = await withUserDb(userId, async () => {
      const noteId = await addNote(contactId, "photo", body);
      // Same privacy switch as a card scan — one setting governs whether ANY
      // captured photo is kept. Off means the transcription is the only receipt.
      if (await shouldStoreCardPhotos()) {
        await saveCardImages(contactId, noteId, read.images);
      }
      const hasBudget = await hasMonthlyAiBudget(userId);
      if (hasBudget) {
        await createExtractionJob({ contactId, kind: "note_extraction", noteId });
      }
      return hasBudget;
    });
  } catch (error) {
    logActionError("addPhotoNote", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  return {
    notice: budgeted
      ? "Photo note saved — extracting facts…"
      : "Photo note saved. Automatic fact extraction is a paid feature.",
  };
}
