import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES } from "@/utils/constants/app";
import type { CaptureImage, CaptureImageType } from "@dhaga/core/src/api/capture";

/** Thrown for well-formed JSON that fails capture-specific validation
 *  (too many images, an image with an unsupported type). The route turns it
 *  into a 400 carrying this message; a bare JSON parse error stays generic. */
export class CaptureValidationError extends Error {}

/** Parsed, trimmed shape of the /api/capture POST body (all fields optional on the wire). */
export interface ParsedCaptureRequest {
  raw: string;
  sourceUrl: string;
  contactId: string;
  /**
   * All card photos for this scan, normalized so callers never branch on the
   * legacy scalar: a request that sent only `imageBase64`/`imageType` arrives
   * here as a one-element array (back-compat with queued mobile requests).
   */
  images: CaptureImage[];
  /** Legacy scalar mirror of `images[0]`, kept for any caller still reading it. */
  imageBase64: string;
  imageType: string;
  geohash: string;
  scannedAt: Date | null;
}

function isCaptureImageType(value: unknown): value is CaptureImageType {
  return CARD_IMAGE_TYPES.some((type) => type === value);
}

/**
 * Normalize the wire body's image fields into a validated `CaptureImage[]`.
 * Prefers the `images[]` array; falls back to the legacy single scalar so
 * old queued requests still scan. Every element's `imageType` is checked
 * against the accepted set — an unsupported type rejects the whole request.
 */
function normalizeImages(body: {
  images?: CaptureImage[];
  imageBase64?: string;
  imageType?: CaptureImageType;
}): CaptureImage[] {
  const candidates: unknown[] = body.images?.length
    ? body.images
    : body.imageBase64
      ? [{ imageBase64: body.imageBase64, imageType: body.imageType ?? "image/jpeg" }]
      : [];

  return candidates.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new CaptureValidationError("Each image needs base64 data and a type.");
    }
    const { imageBase64, imageType } = candidate as {
      imageBase64?: unknown;
      imageType?: unknown;
    };
    const data = typeof imageBase64 === "string" ? imageBase64.trim() : "";
    if (!data) {
      throw new CaptureValidationError("Each image needs base64 data.");
    }
    if (!isCaptureImageType(imageType)) {
      throw new CaptureValidationError(
        "imageType must be image/jpeg, image/png, or image/webp.",
      );
    }
    return { imageBase64: data, imageType };
  });
}

/** Invalid/missing timestamp means "no event grouping" — never an error. */
function parseScannedAt(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parses and trims the /api/capture POST body. Throws on unparseable JSON,
 * and (as a CaptureValidationError) when the images fail validation.
 */
export async function parseCaptureRequest(request: Request): Promise<ParsedCaptureRequest> {
  const body = (await request.json()) as {
    raw?: unknown;
    sourceUrl?: unknown;
    contactId?: unknown;
    images?: CaptureImage[];
    imageBase64?: string;
    imageType?: CaptureImageType;
    geohash?: unknown;
    scannedAt?: unknown;
  };

  const images = normalizeImages(body);
  if (images.length > MAX_CARD_IMAGES) {
    throw new CaptureValidationError(
      `Too many images — up to ${MAX_CARD_IMAGES} photos per scan.`,
    );
  }

  return {
    raw: String(body.raw ?? "").trim(),
    sourceUrl: String(body.sourceUrl ?? "").trim(),
    contactId: String(body.contactId ?? "").trim(),
    images,
    imageBase64: images[0]?.imageBase64 ?? "",
    imageType: images[0]?.imageType ?? "",
    geohash: String(body.geohash ?? "").trim(),
    scannedAt: parseScannedAt(String(body.scannedAt ?? "").trim()),
  };
}
