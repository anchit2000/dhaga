import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES } from "@/utils/constants/app";
import { contactProfileSchema } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";

/**
 * Shared form parsing/validation for the contact create + edit actions. Kept in
 * a plain (non-"use server") module so it can export these sync helpers and the
 * form-state type — a "use server" file may only export async actions. Only the
 * contact action modules import from here; nothing runs on the client.
 */

export interface ContactFormState {
  error?: string;
}

export function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

/** The ContactForm submits its whole state as one JSON `payload` field;
 *  re-validate it here (never trust the client shape) before writing. */
export function parseProfilePayload(
  formData: FormData,
): { ok: true; profile: ContactProfile } | { ok: false; error: string } {
  const raw = String(formData.get("payload") ?? "");
  if (!raw) return { ok: false, error: "Nothing to save yet." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Could not read the form. Please try again." };
  }
  const result = contactProfileSchema.safeParse(parsed);
  if (!result.success) return { ok: false, error: "Some details were invalid." };
  if (!result.data.name.trim()) return { ok: false, error: "Name is required." };
  return { ok: true, profile: result.data };
}

/**
 * Card scans carry every photo through the review form in the single
 * `capturedImages` hidden field (JSON of a CaptureImage[]). Re-validate it
 * here — never trust the client shape — dropping anything malformed and
 * capping the count, so a tampered field can't wedge the save.
 */
export function parseCapturedImages(formData: FormData): CaptureImage[] {
  const raw = String(formData.get("capturedImages") ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const images: CaptureImage[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const { imageBase64, imageType } = item as { imageBase64?: unknown; imageType?: unknown };
    if (typeof imageBase64 !== "string" || !imageBase64) continue;
    const type = CARD_IMAGE_TYPES.find((candidate) => candidate === imageType);
    if (!type) continue;
    images.push({ imageBase64, imageType: type });
  }
  return images.slice(0, MAX_CARD_IMAGES);
}
