"use server";

import { requireSession } from "@/lib/auth/guard";
import { answerSearchQuery } from "@/lib/ai/search";

export interface AskAiState {
  answer?: string;
  notice?: string;
}

export async function askAiAction(
  _previous: AskAiState,
  formData: FormData,
): Promise<AskAiState> {
  await requireSession();
  const query = String(formData.get("q") ?? "").trim();
  if (!query) return { notice: "Type a question first." };
  return answerSearchQuery(query);
}
