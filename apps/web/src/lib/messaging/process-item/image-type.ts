import type { LLMImage } from "@dhaga/core";

/**
 * Decide the vision model's media type for a downloaded attachment.
 *
 * The declared mime type is NOT enough: Telegram's photo payloads carry no mime
 * at all (its client falls back to "application/octet-stream"), so trusting the
 * header alone silently discarded every photo forwarded from Telegram. Sniffing
 * the magic bytes is what makes the photo path work on both channels.
 *
 * Pure — the byte tables are the whole logic, so this is unit-testable without
 * a provider.
 */
const MAGIC: ReadonlyArray<{ mediaType: LLMImage["mediaType"]; bytes: readonly number[] }> = [
  { mediaType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mediaType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
];

function startsWith(data: Uint8Array, bytes: readonly number[]): boolean {
  if (data.length < bytes.length) return false;
  return bytes.every((byte, index) => data[index] === byte);
}

/** "RIFF????WEBP" — the only 12-byte-window format we accept. */
function isWebp(data: Uint8Array): boolean {
  return (
    data.length >= 12 &&
    startsWith(data, [0x52, 0x49, 0x46, 0x46]) &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50
  );
}

function fromMimeType(mimeType: string): LLMImage["mediaType"] | null {
  switch (mimeType.trim().toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "image/jpeg";
    case "image/png":
      return "image/png";
    case "image/webp":
      return "image/webp";
    default:
      return null;
  }
}

export function resolveImageMediaType(
  mimeType: string,
  data: Uint8Array,
): LLMImage["mediaType"] | null {
  const declared = fromMimeType(mimeType);
  if (declared) return declared;
  if (isWebp(data)) return "image/webp";
  return MAGIC.find((entry) => startsWith(data, entry.bytes))?.mediaType ?? null;
}
