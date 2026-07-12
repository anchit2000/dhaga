"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { scanCardImage } from "@/lib/ai/card-scan";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import {
  findContactIdentityCandidates,
  getContact,
  type ContactIdentityCandidate,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { CARD_IMAGE_TYPES } from "@/utils/constants/app";
import type { ExtractedContact, LLMImage } from "@dhaga/core";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export interface QuickAddState {
  contact?: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  error?: string;
  sourceText?: string;
  /** Set only when store-card-photos is on — carried through the review
   *  form so the photo is saved as a visual receipt alongside the contact. */
  imageBase64?: string;
  imageType?: string;
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

/** Card-photo path (M1): parse the photo; keep it as a visual receipt
 *  unless the user turned storage off in Settings. */
export async function scanCardAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const userId = await requireUserId();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Take or choose a card photo first." };
  }
  const mediaType = CARD_IMAGE_TYPES.find((type) => type === photo.type);
  if (!mediaType) return { error: "Use a JPEG, PNG, or WebP photo." };
  if (photo.size > MAX_IMAGE_BYTES) {
    return { error: "Photo too large — try again (max 6 MB)." };
  }
  const image: LLMImage = {
    mediaType,
    dataBase64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
  };
  const result = await scanCardImage(userId, image);
  if (result.error || !result.contact) {
    return { error: result.error ?? "The scan failed." };
  }
  const storePhoto = await shouldStoreCardPhotos();
  return {
    contact: result.contact,
    via: "ai",
    sourceText: result.rawText,
    imageBase64: storePhoto ? image.dataBase64 : undefined,
    imageType: storePhoto ? mediaType : undefined,
  };
}
