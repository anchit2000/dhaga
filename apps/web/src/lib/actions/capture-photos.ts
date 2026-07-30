import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES, MAX_IMAGE_BYTES } from "@/utils/constants/app";
import type { LLMImage } from "@dhaga/core";

export type CapturePhotosResult =
  | { ok: true; images: LLMImage[] }
  | { ok: false; error: string };

/**
 * Read the photos out of a capture FormData and validate them once, in one
 * place. Every client that sends photos uses the same contract — one entry per
 * image, ALL named `photo`, in order (see CardPhotoCapture.submitPhotos) — so
 * the card scan and a photo note share this reader rather than each re-deriving
 * the type/size/count rules and drifting apart.
 *
 * An empty result is NOT an error here: "no photo attached" means different
 * things to different callers (a scan can't proceed; a note can still be typed),
 * so the caller owns that message. Everything else fails loud with copy the
 * user can act on.
 */
export async function readCapturePhotos(formData: FormData): Promise<CapturePhotosResult> {
  const photos = formData
    .getAll("photo")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0);
  if (photos.length > MAX_CARD_IMAGES) {
    return { ok: false, error: `Up to ${MAX_CARD_IMAGES} photos at a time.` };
  }
  const images: LLMImage[] = [];
  for (const photo of photos) {
    const mediaType = CARD_IMAGE_TYPES.find((type) => type === photo.type);
    if (!mediaType) return { ok: false, error: "Use a JPEG, PNG, or WebP photo." };
    if (photo.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Photo too large — try again (max 6 MB each)." };
    }
    images.push({
      mediaType,
      dataBase64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
    });
  }
  return { ok: true, images };
}
