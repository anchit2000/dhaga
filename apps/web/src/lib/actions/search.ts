"use server";

import { after } from "next/server";
import { requireUserId } from "@/lib/auth/guard";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import { answerSearchQuery } from "@/lib/ai/search";
import { hybridSearch, type SearchHit } from "@/lib/repo/search";
import { countUnindexed, ensureIndexed } from "@/lib/repo/embeddings";
import { embeddingsEnabled } from "@/lib/ai/embedder";
import { setSearchWeights } from "@/lib/repo/settings";
import { parseSearchWeights, type SearchWeights } from "@/utils/constants/search";

export interface AskAiState {
  answer?: string;
  notice?: string;
}

export async function askAiAction(
  _previous: AskAiState,
  formData: FormData,
): Promise<AskAiState> {
  const userId = await requireUserId();
  const query = String(formData.get("q") ?? "").trim();
  if (!query) return { notice: "Type a question first." };
  return answerSearchQuery(userId, query);
}

export interface SearchState {
  query: string;
  hits: SearchHit[];
  unindexed: number;
}

export async function searchAction(
  _previous: SearchState,
  formData: FormData,
): Promise<SearchState> {
  await requireUserId();
  const query = String(formData.get("q") ?? "").trim();
  if (!query) return { query: "", hits: [], unindexed: 0 };
  const weights = parseSearchWeights(formData.get("weights")?.toString());
  const [hits, unindexed] = await Promise.all([
    hybridSearch(query, undefined, weights),
    embeddingsEnabled() ? countUnindexed() : Promise.resolve(0),
  ]);
  // Backfill runs after the response is sent — never blocks the palette.
  if (unindexed > 0) after(() => ensureIndexed());
  return { query, hits, unindexed };
}

/**
 * Persists the Search tab's "Tune ranking" sliders. Called on drag-end
 * (onValueCommitted), not on every tick, so dragging a slider doesn't write
 * to the DB per pixel — the live re-rank while dragging goes through
 * searchAction's own `weights` field instead.
 */
export async function saveSearchWeightsAction(weights: SearchWeights): Promise<void> {
  const userId = await requireUserId();
  await setSearchWeights(weights);
  invalidateAppNavigation(userId);
}
