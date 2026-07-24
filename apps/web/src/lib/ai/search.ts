import {
  SEARCH_ANSWER_SYSTEM,
  SEARCH_QUERY_SYSTEM,
  buildSearchAnswerPrompt,
  buildSearchQueryPrompt,
  getLLMClient,
  hasLLM,
  searchQueryPlanSchema,
  type SearchIndexResult,
  type SearchQueryPlan,
} from "@dhaga/core";
import { getSearchIndex } from "@/lib/repo/search-index";
import { contactIdsForPlan } from "@/lib/repo/search-filters";
import { AiBudgetError, assertAiBudget, recordAiAction } from "./metering";

export interface AiAnswerResult {
  answer?: string;
  notice?: string;
}

function candidateBlocks(hits: SearchIndexResult[]): string {
  return hits
    .slice(0, 10)
    .map((hit) => {
      const identity = [hit.label, hit.sublabel].filter(Boolean).join(" · ");
      return [`# ${identity}`, ...(hit.matches ?? [])].join("\n");
    })
    .join("\n\n");
}

/** Stage 1: question → filters + semantic residual (Haiku). Null on failure. */
async function planQuery(query: string): Promise<SearchQueryPlan | null> {
  try {
    const result = await getLLMClient().extract({
      schema: searchQueryPlanSchema,
      system: SEARCH_QUERY_SYSTEM,
      prompt: buildSearchQueryPrompt(query),
      tier: "extract",
    });
    // NOT metered here: a search is one user-visible action, recorded once
    // when the answer stage completes below. Metering this Haiku plan call
    // too would double-charge each search against the monthly cap (and let a
    // user one action below the cap slip past the single assertAiBudget check
    // above).
    return result.data;
  } catch {
    return null;
  }
}

/**
 * M6 full pipeline: understand the query (Haiku) → retrieve (structured
 * filters + hybrid keyword/semantic, all local) → answer with receipts
 * (Sonnet). Stage 1 failing degrades to unfiltered retrieval, never to
 * a broken search.
 */
export async function answerSearchQuery(
  userId: string,
  query: string,
): Promise<AiAnswerResult> {
  if (!hasLLM()) {
    return { notice: "Configure an LLM provider to get AI answers over your graph." };
  }
  try {
    await assertAiBudget(userId);
  } catch (error) {
    return {
      notice: error instanceof AiBudgetError ? error.message : "The AI call failed.",
    };
  }

  const plan = await planQuery(query);
  const restrictTo = plan ? await contactIdsForPlan(plan) : undefined;
  const retrievalQuery = plan?.semantic_query || query;
  const index = getSearchIndex();
  let hits = await index.search({ text: retrievalQuery, kinds: ["contact"], restrictTo });
  if (hits.length === 0 && restrictTo) {
    // Filters matched nobody — retry unfiltered rather than answering blind.
    hits = await index.search({ text: retrievalQuery, kinds: ["contact"] });
  }
  if (hits.length === 0) {
    return {
      notice:
        "Nothing in your graph matches that yet — the AI has no records to reason over.",
    };
  }

  try {
    const result = await getLLMClient().complete({
      system: SEARCH_ANSWER_SYSTEM,
      prompt: buildSearchAnswerPrompt(query, candidateBlocks(hits)),
      tier: "reason",
    });
    await recordAiAction("search", result.model, result.usage);
    return { answer: result.data };
  } catch (error) {
    return {
      notice:
        error instanceof AiBudgetError ? error.message : "The AI call failed.",
    };
  }
}
