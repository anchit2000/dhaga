"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/guard";
import { answerSearchQuery } from "@/lib/ai/search";
import { backfillEmbeddings } from "@/lib/repo/embeddings";

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

export interface IndexState {
  indexed?: number;
  error?: string;
}

/** Backfill the local semantic index (first run downloads the model). */
export async function buildIndexAction(): Promise<IndexState> {
  await requireSession();
  try {
    const indexed = await backfillEmbeddings();
    revalidatePath("/app/search");
    return { indexed };
  } catch {
    return { error: "Indexing failed — check the server log and retry." };
  }
}
