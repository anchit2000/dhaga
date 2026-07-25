import {
  SEARCH_QUERY_SYSTEM,
  buildSearchQueryPrompt,
  getLLMClient,
  searchQueryPlanSchema,
  type SearchIndexResult,
  type SearchQueryPlan,
} from "@dhaga/core";
import { getSearchIndex } from "@/lib/repo/search-index";
import { isTransientConnectionError } from "@/utils/constants/db";
import { AiBudgetError } from "../metering";
import type { AiAnswerResult } from "./types";

/** The retrieved candidates, formatted as the answer prompt's evidence blocks
 *  (identity heading + its match snippets). Shared by the sync + streaming
 *  answer paths. */
export function candidateBlocks(hits: SearchIndexResult[]): string {
  return hits
    .slice(0, 10)
    .map((hit) => {
      const identity = [hit.label, hit.sublabel].filter(Boolean).join(" · ");
      return [`# ${identity}`, ...(hit.matches ?? [])].join("\n");
    })
    .join("\n\n");
}

/** Stage 1: question → filters + semantic residual (Haiku). Null on failure. */
export async function planQuery(query: string): Promise<SearchQueryPlan | null> {
  try {
    const result = await getLLMClient().extract({
      schema: searchQueryPlanSchema,
      system: SEARCH_QUERY_SYSTEM,
      prompt: buildSearchQueryPrompt(query),
      tier: "extract",
    });
    // NOT metered here: a search is one user-visible action, recorded once
    // when the answer stage completes. Metering this Haiku plan call too would
    // double-charge each search against the monthly cap (and let a user one
    // action below the cap slip past the single assertAiBudget check).
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Turn an Ask-Dhaga failure into an honest, styled result instead of a flat
 * "the AI call failed". A reached monthly cap degrades to the free
 * keyword/semantic matches (local, unmetered) with an upgrade nudge; the burst
 * guard and transient connection blips get a retry cue; anything else is a
 * genuine AI failure — the only case the client paints red.
 */
export async function aiFailureResult(
  error: unknown,
  query: string,
  hits: SearchIndexResult[] | null,
): Promise<AiAnswerResult> {
  if (error instanceof AiBudgetError && error.kind === "cap") {
    const fallbackHits =
      hits ?? (await getSearchIndex().search({ text: query, kinds: ["contact"] }));
    return {
      kind: "upgrade",
      notice: "Showing keyword matches — upgrade for a reasoned answer with receipts.",
      hits: fallbackHits,
    };
  }
  if (error instanceof AiBudgetError) {
    // Burst guard: the message already reads "wait a few seconds and try again".
    return { kind: "retry", notice: error.message };
  }
  if (isTransientConnectionError(error)) {
    return { kind: "retry", notice: "Dhaga is busy right now — please try again in a moment." };
  }
  return { kind: "error", notice: "The AI had trouble answering. Please retry." };
}
