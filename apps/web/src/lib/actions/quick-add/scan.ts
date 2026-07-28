"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { scanCardImages } from "@/lib/ai/card-scan";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES, MAX_IMAGE_BYTES } from "@/utils/constants/app";
import type { LLMImage } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";
import type { QuickAddState } from "./state";

/** Card-photo path (M1): parse one or more photos of the same card
 *  (front+back, leaflet pages) into ONE contact; keep each as a visual
 *  receipt unless the user turned storage off in Settings. Classification is
 *  text-only — a card scan always produces a contact to create. */
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
  // Read the setting in its own short scope — the scan (vision LLM) has already
  // returned, so no connection is ever held across the model call.
  const storePhoto = await withUserDb(userId, () => shouldStoreCardPhotos());
  return {
    contact: result.contact,
    via: "ai",
    sourceText: result.rawText,
    images: storePhoto ? captured : undefined,
  };
}
