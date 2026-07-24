/**
 * Brand tokens mirrored by hand from apps/web/src/app/globals.css @theme —
 * CSS custom properties can't cross into React Native. Keep the two in sync.
 */
export const COLORS = {
  ink: "#0d0b09",
  panel: "#16120e",
  panel2: "#1d1812",
  seam: "#2b241b",
  paper: "#f3ede2",
  fog: "#a49a8a",
  amber: "#e2a44c",
} as const;

/** SecureStore keys for the connection settings. */
export const SETTINGS_KEYS = {
  baseUrl: "dhaga.baseUrl",
  apiKey: "dhaga.apiKey",
} as const;

/**
 * On-device voice-vocabulary store: a document-directory JSON file (same
 * convention as pending-capture.json) holding the terms the user has taught
 * dictation to spell a specific way.
 */
export const VOCAB_STORE_FILE = "voice-vocab.json";

/** Default decoder/LLM biasing weight for a freshly taught vocab term. */
export const VOCAB_DEFAULT_BOOST = 1;

/** expo-router segment name + href for the voice-vocabulary teaching screen. */
export const VOCAB_SCREEN = "vocab" as const;
export const VOCAB_HREF = "/vocab" as const;

/**
 * OCR output below this bar (or with no @ and no digit) is judged unusable
 * and the scan falls back to uploading the photo for a server vision parse.
 */
export const OCR_MIN_CHARS = 24;

/** /api/capture caps `raw` at 10,000 chars; trim OCR output to fit. */
export const RAW_TEXT_MAX_CHARS = 10_000;

/** Fallback photo upload: longest edge + jpeg compression, keeping the
 * base64 body well under the server's ~6 MB cap. */
export const FALLBACK_IMAGE_WIDTH = 1600;
export const FALLBACK_IMAGE_COMPRESS = 0.7;

/** Shutter capture quality (0–1). */
export const CAPTURE_QUALITY = 0.7;

/**
 * Most photos of one card/leaflet that merge into a single contact (front+back,
 * or a few leaflet pages). Caps camera multi-shot and library multi-select so a
 * scan can't balloon the /api/capture body past the server's per-image limits.
 */
export const MAX_SCAN_IMAGES = 6;

/**
 * Crop review screen (docs/ideas.md #2). Business cards rarely fill the
 * whole camera frame, so the default rectangle starts inset instead of
 * covering the full photo.
 */
export const CROP_INSET_X_RATIO = 0.08;
export const CROP_INSET_Y_RATIO = 0.16;

/** Crop rectangle can't shrink below this (dp) — keeps handles usable and
 * stops the user from cropping to nothing. */
export const CROP_MIN_SIZE = 80;

/** Corner handle touch target (>=44x44 per the mobile-first UI rule); the
 * visible dot inside it is smaller. */
export const CROP_HANDLE_TOUCH_SIZE = 44;
export const CROP_HANDLE_VISUAL_SIZE = 20;

/** Re-encode quality for the cropped photo before it continues into the
 * existing OCR pipeline (buildScanPayload resizes/compresses again there). */
export const CROP_JPEG_COMPRESS = 0.9;
