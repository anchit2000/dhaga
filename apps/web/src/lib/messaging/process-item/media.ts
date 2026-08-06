import type { LLMImage } from "@dhaga/core";
import type { InboundMediaRef } from "@dhaga/core/src/messaging";
import { hasTranscription, getTranscriptionClient } from "@dhaga/core/src/transcription";
import { logActionError } from "@/lib/actions/resilience";
import { scanCardImages } from "@/lib/ai/card-scan";
import { AiBudgetError } from "@/lib/ai/metering";
import { transcribePhotoNote } from "@/lib/ai/photo-note";
import { withUserDb } from "@/lib/db/request-scope";
import { saveCardImages } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { photoUnreadableNotice, voiceSkippedNotice } from "@/utils/constants/messaging";
import { ingestText, type IngestedNote } from "../ingest-text";
import { createContactWithNote } from "../note-write";
import { addNotice, setCurrentContact, type WalkState } from "../walk-state";
import { resolveImageMediaType } from "./image-type";

/**
 * A forwarded PHOTO takes the existing vision capture path, in two steps:
 *
 *   1. the card scanner (the same one the web card-scan dock uses) — a business
 *      card or badge becomes a contact, and the photo's caption becomes a note
 *      on that contact;
 *   2. anything the scanner finds no person on (a whiteboard, a poster, a
 *      conference schedule) is read as TEXT and ingested as a note, so the photo
 *      still lands in the graph instead of being thrown away.
 *
 * Only if both come back empty is a notice raised — the sender is always told.
 */
export async function handleImage(
  state: WalkState,
  media: InboundMediaRef,
  caption: string | null,
): Promise<void> {
  const downloaded = await state.client.downloadMedia(media);
  const mediaType = resolveImageMediaType(downloaded.mimeType, downloaded.data);
  if (!mediaType) {
    addNotice(state, photoUnreadableNotice());
    return;
  }
  const image: LLMImage = {
    mediaType,
    dataBase64: Buffer.from(downloaded.data).toString("base64"),
  };

  const scan = await scanCardImages(state.userId, [image]);
  const contact = scan.contact;
  if (contact) {
    // The receipt is the card's own fields (already stored structurally), so it
    // gets no fact extraction — the caption, a human sentence, does.
    const { contactId, noteId } = await createContactWithNote(
      state.userId,
      contact,
      "capture_source",
      scan.rawText ?? "",
    );
    setCurrentContact(state, contactId, contact.name);
    await keepPhoto(state, { contactId, noteId }, image);
    if (caption?.trim()) await ingestText(state, caption, "capture_source", "text");
    return;
  }

  // transcribePhotoNote lets AiBudgetError propagate so each caller decides what
  // it means. Here it means: say why the photo didn't land, keep the batch going.
  let transcript: string | undefined;
  try {
    transcript = (await transcribePhotoNote(state.userId, [image]))?.trim();
  } catch (error) {
    addNotice(state, error instanceof AiBudgetError ? error.message : photoUnreadableNotice());
    return;
  }
  if (!transcript) {
    addNotice(state, photoUnreadableNotice());
    return;
  }
  // Kind "photo": the body was read OFF a photo, so the contact timeline (and
  // the re-run-extraction affordance) shows it for what it is.
  const body = caption?.trim() ? `${transcript}\n\n${caption.trim()}` : transcript;
  const ingested = await ingestText(state, body, "photo", "photo");
  await keepPhoto(state, ingested, image);
}

/**
 * Keep the photo itself, not just what was read off it. The web capture surfaces
 * have always done this (../../actions/photo-note.ts, api/capture/handlers.ts);
 * forwarding the same photo over WhatsApp/Telegram silently kept only the
 * transcription, so a noticeboard or handwritten page arrived with no way to
 * check the reading against the original.
 *
 * Governed by the SAME per-user privacy switch as a card scan — one setting
 * decides whether any captured photo is kept — and hung off the note where one
 * exists, so deleting that note hard-deletes the photo with it.
 *
 * Best-effort on purpose: the note is already written and the sender already
 * charged for the vision call, so a failure to keep the receipt must not throw
 * that away. A photo that lands on no note at all (an unanswered "which person
 * did you mean?") is simply not stored — there is nothing yet to attach it to.
 */
async function keepPhoto(
  state: WalkState,
  ingested: IngestedNote | null,
  image: LLMImage,
): Promise<void> {
  if (!ingested) return;
  try {
    await withUserDb(state.userId, async () => {
      if (!(await shouldStoreCardPhotos())) return;
      await saveCardImages(ingested.contactId, ingested.noteId, [image]);
    });
  } catch (error) {
    // No PII: the id and the failure, never the image or what was read off it.
    logActionError("messaging.keepPhoto", error);
  }
}

/**
 * Voice notes are refused at the door when nothing can transcribe them
 * (./normalize), so an audio item only exists if a provider was registered when
 * it arrived. It can still have gone away since — say so rather than pretend.
 */
export async function handleAudio(state: WalkState, media: InboundMediaRef): Promise<void> {
  if (!hasTranscription()) {
    addNotice(state, voiceSkippedNotice());
    return;
  }
  const downloaded = await state.client.downloadMedia(media);
  const result = await getTranscriptionClient().transcribe({
    data: downloaded.data,
    mimeType: downloaded.mimeType,
  });
  await ingestText(state, result.text, "voice", "voice");
}
