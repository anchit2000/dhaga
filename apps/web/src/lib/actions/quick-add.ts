"use server";

import { requireSession } from "@/lib/auth/guard";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { scanCardImage } from "@/lib/ai/card-scan";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
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
}

export async function extractQuickAddAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  await requireSession();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return { error: "Paste some text first." };
  const result = await extractContactFromText(raw);
  return {
    contact: result.contact,
    via: result.via,
    notice: result.notice,
    sourceText: raw,
  };
}

/** Card-photo path (M1): parse the photo; keep it as a visual receipt
 *  unless the user turned storage off in Settings. */
export async function scanCardAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  await requireSession();
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
  const result = await scanCardImage(image);
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
