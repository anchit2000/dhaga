"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { scanCardImages } from "@/lib/ai/card-scan";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import {
  findContactIdentityCandidates,
  getContact,
  type ContactIdentityCandidate,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES, MAX_IMAGE_BYTES } from "@/utils/constants/app";
import type { ExtractedContact, LLMImage } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";

export interface QuickAddState {
  contact?: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  error?: string;
  sourceText?: string;
  /** Set only when store-card-photos is on — every scanned photo, carried
   *  through the review form (as the `capturedImages` hidden field) so each
   *  is saved as a visual receipt alongside the merged contact. */
  images?: CaptureImage[];
  matches?: ContactIdentityCandidate[];
}

export async function extractQuickAddAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const userId = await requireUserId();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return { error: "Paste some text first." };
  if (formData.get("skipDisambiguation") !== "true") {
    const matches = await findContactIdentityCandidates(raw);
    if (matches.length > 1) {
      return { matches, sourceText: raw };
    }
  }
  const result = await extractContactFromText(userId, raw);
  return {
    contact: result.contact,
    via: result.via,
    notice: result.notice,
    sourceText: raw,
  };
}

export async function attachCapturedNoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const raw = String(formData.get("raw") ?? "").trim();
  if (!contactId || !raw) return;
  const detail = await getContact(contactId);
  if (!detail || detail.contact.source === "mentioned") return;
  const noteId = await addNote(contactId, "voice", raw);
  await upsertEmbedding("note", noteId, contactId, raw);
  await extractAndApplyNote(
    userId,
    contactId,
    noteId,
    detail.contact.name,
    raw,
  );
  redirect(`/app/people/${contactId}`);
}

/** Card-photo path (M1): parse one or more photos of the same card
 *  (front+back, leaflet pages) into ONE contact; keep each as a visual
 *  receipt unless the user turned storage off in Settings. */
export async function scanCardAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const userId = await requireUserId();
  const photos = formData
    .getAll("photo")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0);
  if (photos.length === 0) {
    return { error: "Take or choose a card photo first." };
  }
  if (photos.length > MAX_CARD_IMAGES) {
    return { error: `Up to ${MAX_CARD_IMAGES} photos per card.` };
  }
  const images: LLMImage[] = [];
  const captured: CaptureImage[] = [];
  for (const photo of photos) {
    const mediaType = CARD_IMAGE_TYPES.find((type) => type === photo.type);
    if (!mediaType) return { error: "Use a JPEG, PNG, or WebP photo." };
    if (photo.size > MAX_IMAGE_BYTES) {
      return { error: "Photo too large — try again (max 6 MB each)." };
    }
    const dataBase64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
    images.push({ mediaType, dataBase64 });
    captured.push({ imageBase64: dataBase64, imageType: mediaType });
  }
  const result = await scanCardImages(userId, images);
  if (result.error || !result.contact) {
    return { error: result.error ?? "The scan failed." };
  }
  const storePhoto = await shouldStoreCardPhotos();
  return {
    contact: result.contact,
    via: "ai",
    sourceText: result.rawText,
    images: storePhoto ? captured : undefined,
  };
}
