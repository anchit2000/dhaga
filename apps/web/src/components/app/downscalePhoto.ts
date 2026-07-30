"use client";

import { CARD_SCAN_JPEG_QUALITY, CARD_SCAN_MAX_DIMENSION } from "@/utils/constants/app";

/**
 * Shrink a card photo client-side before upload: phone photos are 3–10 MB, and
 * the vision model reads a card just as well from ~1024px. Fewer image tokens
 * is less upload AND a shorter round trip (see CARD_SCAN_MAX_DIMENSION).
 */
export async function downscalePhoto(
  file: File,
  maxDimension = CARD_SCAN_MAX_DIMENSION,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    // Re-encode even when the image is already small enough dimensionally: a
    // 1024px photo straight off a phone can still be a heavy JPEG.
    if (scale === 1 && file.size < 400_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CARD_SCAN_JPEG_QUALITY),
    );
    return blob ? new File([blob], "card.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
