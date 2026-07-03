"use server";

import { requireSession } from "@/lib/auth/guard";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { scanCardImage } from "@/lib/ai/card-scan";
import type { ExtractedContact, LLMImage } from "@dhaga/core";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export interface QuickAddState {
  contact?: ExtractedContact;
  via?: "ai" | "heuristic";
  notice?: string;
  error?: string;
  sourceText?: string;
}

export async function extractQuickAddAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  await requireSession();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return { error: "Paste some text first." };
  const result = await extractContactFromText(raw);
  return {
    contact: result.contact,
    via: result.via,
    notice: result.notice,
    sourceText: raw,
  };
}

/** Card-photo path (M1): the photo is parsed, never stored. */
export async function scanCardAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  await requireSession();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Take or choose a card photo first." };
  }
  const mediaType = IMAGE_TYPES.find((type) => type === photo.type);
  if (!mediaType) return { error: "Use a JPEG, PNG, or WebP photo." };
  if (photo.size > MAX_IMAGE_BYTES) {
    return { error: "Photo too large — try again (max 6 MB)." };
  }
  const image: LLMImage = {
    mediaType,
    dataBase64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
  };
  const result = await scanCardImage(image);
  if (result.error || !result.contact) {
    return { error: result.error ?? "The scan failed." };
  }
  return {
    contact: result.contact,
    via: "ai",
    sourceText: result.rawText,
  };
}
