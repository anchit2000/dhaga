"use server";

import { requireSession } from "@/lib/auth/guard";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import type { ExtractedContact } from "@dhaga/core";

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
