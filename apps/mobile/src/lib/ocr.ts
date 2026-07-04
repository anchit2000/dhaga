import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { extractTextFromImage, isSupported } from "expo-text-extractor";

import {
  FALLBACK_IMAGE_COMPRESS,
  FALLBACK_IMAGE_WIDTH,
  OCR_MIN_CHARS,
  RAW_TEXT_MAX_CHARS,
} from "@/utils/constants";

import type { ScanPayload } from "@/types";

/**
 * Card photo → /api/capture body, cheapest tier first (BRD §6.1): free
 * on-device OCR (Apple Vision on iOS, ML Kit on Android) → text path; if the
 * device can't OCR or the output looks unusable, fall back to uploading a
 * resized photo for the server-side vision parse.
 */
export async function buildScanPayload(photoUri: string): Promise<ScanPayload> {
  if (isSupported) {
    try {
      const lines = await extractTextFromImage(photoUri);
      const raw = lines.join("\n").trim().slice(0, RAW_TEXT_MAX_CHARS);
      if (isUsableOcrText(raw)) {
        return { request: { raw }, path: "on-device" };
      }
    } catch {
      // OCR module failure — the image fallback below still captures the card.
    }
  }
  return { request: await imageRequest(photoUri), path: "image-fallback" };
}

/**
 * Judges OCR *quality*, not contact structure (parsing stays server-side):
 * a real card yields at least a name line plus an email or phone, so tiny
 * output or output with neither an "@" nor a digit means the OCR missed.
 */
function isUsableOcrText(text: string): boolean {
  if (text.length < OCR_MIN_CHARS) return false;
  return text.includes("@") || /\d/.test(text);
}

async function imageRequest(photoUri: string): Promise<ScanPayload["request"]> {
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
