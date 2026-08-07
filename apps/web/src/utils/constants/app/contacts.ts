import type { CaptureImageType } from "@dhaga/core/src/api/capture";

export const CONTACT_SOURCES = ["manual", "quick_add", "import", "messaging"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** Accepted card-photo formats (scan input and stored visual receipts). */
export const CARD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const satisfies readonly CaptureImageType[];
export type CardImageType = (typeof CARD_IMAGE_TYPES)[number];

/** Max raw byte size of a single uploaded card photo (~6 MB). */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/**
 * Long edge (px) and JPEG quality a card photo is downscaled to before upload.
 * Measured against a real card: 1600px cost ~0.5s more per scan than 1024px for
 * identical extraction, and 768px started misreading digits in phone numbers.
 * 1024 is the point where accuracy still holds — don't lower it without
 * re-running the check in docs/TESTING.md §7c.
 */
export const CARD_SCAN_MAX_DIMENSION = 1024;
export const CARD_SCAN_JPEG_QUALITY = 0.8;

/**
 * Max photos merged into ONE contact per scan — front+back of a card, or a
 * few pages of the same leaflet. They all describe the same person; the
 * server merges them and keeps each as a visual receipt.
 */
export const MAX_CARD_IMAGES = 6;
