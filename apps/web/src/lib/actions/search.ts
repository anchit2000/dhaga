"use server";

import { after } from "next/server";
import type { SearchIndexResult } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { mutation } from "@/lib/actions/mutation";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import type { AiAnswerResult } from "@/lib/ai/search";
import { getSearchIndex } from "@/lib/repo/search-index";
import { embeddingsEnabled } from "@/lib/ai/embedder";
import { setSearchWeights } from "@/lib/repo/settings";
import { parseSearchWeights, type SearchWeights } from "@/utils/constants/search";

/** The styled-notice shape AskNotice renders — a notice with its discriminant
 *  and any cap-fallback keyword hits. (Was the Ask-Dhaga server-action state;
 *  the tab now streams via /api/search/ask, but the notice shape is unchanged.) */
export type AskAiState = AiAnswerResult;

export interface SearchState {
  query: string;
  hits: SearchIndexResult[];
  unindexed: number;
  /**
   * Whether semantic (embedding) retrieval actually contributed to `hits`.
   * `embeddingsEnabled()` is server-only env config, and the palette is a
   * client component, so it rides back on the same channel `unindexed` already
   * uses rather than through a second lookup. The "Tune ranking" panel greys
   * out its Semantic slider when this is false — with embeddings off the
   * semantic source returns nothing and the slider weights an empty set.
   */
  semanticEnabled: boolean;
}

export async function searchAction(
  _previous: SearchState,
  formData: FormData,
): Promise<SearchState> {
  await requireUserId();
  const query = String(formData.get("q") ?? "").trim();
  // Resolved before the empty-query bail so BOTH return paths carry it —
  // otherwise clearing the query would flip the Semantic slider's gate.
  const semanticEnabled = embeddingsEnabled();
  if (!query) return { query: "", hits: [], unindexed: 0, semanticEnabled };
  const weights = parseSearchWeights(formData.get("weights")?.toString());
  const index = getSearchIndex();
  const [hits, unindexed] = await Promise.all([
    index.search({ text: query, kinds: ["contact"], weights }),
    semanticEnabled ? index.countUnindexed() : Promise.resolve(0),
  ]);
  // Backfill runs after the response is sent — never blocks the palette.
  if (unindexed > 0) after(() => index.reindex());
  return { query, hits, unindexed, semanticEnabled };
}

/**
 * Persists the Search tab's "Tune ranking" sliders. Called on drag-end
 * (onValueCommitted), not on every tick, so dragging a slider doesn't write
 * to the DB per pixel — the live re-rank while dragging goes through
 * searchAction's own `weights` field instead.
 */
export async function saveSearchWeightsAction(weights: SearchWeights): Promise<void> {
  const r = await mutation("saveSearchWeights", async (userId) => {
    await setSearchWeights(weights);
    invalidateAppNavigation(userId);
  });
  if (!r.ok) throw new Error(r.error);
}
