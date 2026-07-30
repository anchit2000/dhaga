"use server";

import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { scanCardImages } from "@/lib/ai/card-scan";
import { readCapturePhotos } from "@/lib/actions/capture-photos";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
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
  // Same reader (and the same type/size/count rules) as every other photo
  // capture — see lib/actions/capture-photos.ts.
  const read = await readCapturePhotos(formData);
  if (!read.ok) return { error: read.error };
  if (read.images.length === 0) {
    return { error: "Take or choose a card photo first." };
  }
  const images = read.images;
  const captured: CaptureImage[] = images.map((image) => ({
    imageBase64: image.dataBase64,
    imageType: image.mediaType,
  }));
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
    scanActionId: result.actionId,
  };
}
