/**
 * Request/response contract for POST /api/capture — the one-shot ingestion
 * endpoint shared by the browser extension and the mobile app. Types only
 * (no runtime code): clients deep-import this module so the Anthropic SDK
 * re-exported by the package barrel never enters their bundles.
 */

/** Accepted card-photo formats for the image-scan path. */
export type CaptureImageType = "image/jpeg" | "image/png" | "image/webp";

/** Which pipeline produced the extraction. */
export type CaptureVia = "ai" | "heuristic";

/**
 * All fields optional; the server picks the branch:
 * - `imageBase64` (+ `imageType`) → vision card scan
 * - `contactId` + `raw` → attach the text as a note on an existing contact
 * - `raw` alone → extract a new contact from text
 */
export interface CaptureRequest {
  /** Free text (email signature, OCR output, page selection). ≤10,000 chars. */
  raw?: string;
  /** Recorded on the receipt note as provenance. */
  sourceUrl?: string;
  /** Attach mode: id of the existing contact the text belongs to. */
  contactId?: string;
  /** Raw base64 (no data-URI prefix). ≤8,000,000 chars (~6 MB). */
  imageBase64?: string;
  imageType?: CaptureImageType;
  /** Coarse geohash-6 of the scan location (mobile, permission-gated; BRD §6.2). */
  geohash?: string;
  /** ISO-8601 timestamp of when the scan was taken (mobile; pairs with geohash). */
  scannedAt?: string;
}

/**
 * Which session (M2 auto event grouping, BRD §6.2) a new-contact scan landed
 * in — omitted entirely when the request carried no geohash/scannedAt.
 * `isNew` tells the client to prompt once for a session name.
 */
export interface CaptureSessionResult {
  id: string;
  isNew: boolean;
}

/** Success shape for the image-scan branch. */
export interface CaptureImageResponse {
  id: string;
  name: string;
  via: "ai";
  photoStored: boolean;
  notice: null;
  session: CaptureSessionResult | null;
}

/** Success shape for the attach-to-contact branch. */
export interface CaptureAttachResponse {
  id: string;
  name: string;
  attached: true;
  notice: string | null;
}

/** Success shape for the new-contact-from-text branch. */
export interface CaptureTextResponse {
  id: string;
  name: string;
  company: string | null;
  via: CaptureVia;
  notice: string | null;
  session: CaptureSessionResult | null;
}

export type CaptureResponse =
  | CaptureImageResponse
  | CaptureAttachResponse
  | CaptureTextResponse;

/** Error body for all non-2xx statuses (400/401/404/422). */
export interface CaptureErrorResponse {
  error: string;
}
