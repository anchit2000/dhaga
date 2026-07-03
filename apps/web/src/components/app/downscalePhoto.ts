"use client";

/**
 * Shrink a card photo client-side before upload: phone photos are 3–10 MB;
 * ~1600px JPEG is plenty for the vision model and keeps requests fast.
 */
export async function downscalePhoto(
  file: File,
  maxDimension = 1600,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    if (scale === 1 && file.size < 2_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob ? new File([blob], "card.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
