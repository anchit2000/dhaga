import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { extractTextFromImage, isSupported } from "expo-text-extractor";

import {
  FALLBACK_IMAGE_COMPRESS,
  FALLBACK_IMAGE_WIDTH,
  OCR_MIN_CHARS,
  RAW_TEXT_MAX_CHARS,
} from "@/utils/constants";

import type { CaptureImage } from "@dhaga/core/src/api/capture";
import type { ScanPayload } from "@/types";

/**
 * Card photos → /api/capture body, cheapest tier first (BRD §6.1). One scan
 * can carry several photos of the SAME card/leaflet (front+back, or pages) —
 * they merge into one contact server-side. Free on-device OCR (Apple Vision on
 * iOS, ML Kit on Android) runs over every photo; if the combined text looks
 * usable it's sent as the text path, otherwise each photo is resized and
 * uploaded as an `images[]` element for the server-side vision parse.
 */
export async function buildScanPayload(photoUris: string[]): Promise<ScanPayload> {
  if (isSupported) {
    try {
      const perImage = await Promise.all(photoUris.map(extractText));
      const combined = perImage.filter(Boolean).join("\n\n").trim().slice(0, RAW_TEXT_MAX_CHARS);
      if (isUsableOcrText(combined)) {
        return { request: { raw: combined }, path: "on-device" };
      }
    } catch {
      // OCR module failure — the image fallback below still captures the cards.
    }
  }
  const images = await Promise.all(photoUris.map(imagePart));
  return { request: { images }, path: "image-fallback" };
}

/** On-device OCR for one photo; joined lines, trimmed (empty on failure via the caller's catch). */
async function extractText(photoUri: string): Promise<string> {
  const lines = await extractTextFromImage(photoUri);
  return lines.join("\n").trim();
}

/**
 * Judges combined OCR *quality*, not contact structure (parsing stays
 * server-side): a real card yields at least a name line plus an email or phone,
 * so tiny output or output with neither an "@" nor a digit means the OCR missed.
 */
function isUsableOcrText(text: string): boolean {
  if (text.length < OCR_MIN_CHARS) return false;
  return text.includes("@") || /\d/.test(text);
}

/** Resize + JPEG-compress one photo to a base64 `images[]` element, kept well under the server's ~6 MB cap. */
async function imagePart(photoUri: string): Promise<CaptureImage> {
  const image = await ImageManipulator.manipulate(photoUri)
    .resize({ width: FALLBACK_IMAGE_WIDTH })
    .renderAsync();
  const saved = await image.saveAsync({
    base64: true,
    compress: FALLBACK_IMAGE_COMPRESS,
    format: SaveFormat.JPEG,
  });
  if (!saved.base64) {
    throw new Error("Couldn't prepare the photo for upload.");
  }
  return { imageBase64: saved.base64, imageType: "image/jpeg" };
}
