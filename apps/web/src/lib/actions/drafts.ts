"use server";

import { requireSession } from "@/lib/auth/guard";
import { generateFollowUpDraft } from "@/lib/ai/draft";

export interface DraftState {
  draft?: string;
  error?: string;
}

export async function draftFollowUpAction(
  _previous: DraftState,
  formData: FormData,
): Promise<DraftState> {
  await requireSession();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return { error: "Missing contact." };
  return generateFollowUpDraft(contactId);
}
