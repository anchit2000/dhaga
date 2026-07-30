import type { LLMImage } from "@dhaga/core";
import type { InboundMediaRef } from "@dhaga/core/src/messaging";
import { hasTranscription, getTranscriptionClient } from "@dhaga/core/src/transcription";
import { scanCardImages } from "@/lib/ai/card-scan";
import { AiBudgetError } from "@/lib/ai/metering";
import { transcribePhotoNote } from "@/lib/ai/photo-note";
import { photoUnreadableNotice, voiceSkippedNotice } from "@/utils/constants/messaging";
import { ingestText } from "../ingest-text";
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
    const { contactId } = await createContactWithNote(
      state.userId,
      contact,
      "capture_source",
      scan.rawText ?? "",
    );
    setCurrentContact(state, contactId, contact.name);
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
  await ingestText(state, body, "photo", "photo");
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
