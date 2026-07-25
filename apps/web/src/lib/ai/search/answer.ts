import {
  SEARCH_ANSWER_SYSTEM,
  buildSearchAnswerPrompt,
  getLLMClient,
  hasLLM,
  type SearchIndexResult,
  type SearchQueryPlan,
} from "@dhaga/core";
import { getSearchIndex } from "@/lib/repo/search-index";
import { contactIdsForPlan } from "@/lib/repo/search-filters";
import { assertAiBudget, recordAiAction } from "../metering";
import { aiFailureResult, candidateBlocks, planQuery } from "./pipeline";
import type { AiAnswerResult, SearchReceipt, SearchStreamEvent } from "./types";

/**
 * M6 full pipeline: understand the query (Haiku) → retrieve (structured
 * filters + hybrid keyword/semantic, all local) → answer with receipts
 * (Sonnet). Stage 1 failing degrades to unfiltered retrieval, never to
 * a broken search. Non-streaming; the Telegram webhook (no client to stream
 * to) and any batch caller use this — the palette uses streamSearchAnswer.
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
    // Hits aren't retrieved yet here; the cap fallback pulls its own.
    return aiFailureResult(error, query, null);
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
    return aiFailureResult(error, query, hits);
  }
}

/** A short, honest descriptor of what the plan scoped to, for a step label —
 *  the structured filters if any, else the semantic residual. */
function describePlan(plan: SearchQueryPlan): string {
  const signals = [...plan.tags, plan.company ?? "", plan.event ?? ""].filter(
    (signal) => signal.trim().length > 0,
  );
  if (signals.length > 0) return signals.join(", ");
  return plan.semantic_query.trim() || "your question";
}

function toReceipt(hit: SearchIndexResult): SearchReceipt {
  return { id: hit.id, label: hit.label, sublabel: hit.sublabel };
}

/** Maps an aiFailureResult into the stream's single terminal notice event. */
function toNoticeEvent(failure: AiAnswerResult): SearchStreamEvent {
  return {
    type: "notice",
    message: failure.notice ?? "The AI had trouble answering. Please retry.",
    kind: failure.kind,
    hits: failure.hits,
  };
}

/**
 * Streaming counterpart to {@link answerSearchQuery}: the same understand →
 * retrieve → answer pipeline, surfaced as it happens. Deterministic reasoning
 * steps arrive first, then the answer token-by-token, then the receipts. Meters
 * the search exactly once, at the end, from the resolved stream usage. Every
 * failure path reuses aiFailureResult (cap → free keyword fallback, burst /
 * transient → retry, everything else → genuine error) as one notice event.
 */
export async function* streamSearchAnswer(
  userId: string,
  query: string,
): AsyncGenerator<SearchStreamEvent> {
  if (!hasLLM()) {
    yield {
      type: "notice",
      message: "Configure an LLM provider to get AI answers over your graph.",
    };
    return;
  }

  yield { type: "step", label: "Understanding your question" };

  try {
    await assertAiBudget(userId);
  } catch (error) {
    // Hits aren't retrieved yet here; the cap fallback pulls its own.
    yield toNoticeEvent(await aiFailureResult(error, query, null));
    return;
  }

  const plan = await planQuery(query);
  const restrictTo = plan ? await contactIdsForPlan(plan) : undefined;
  const retrievalQuery = plan?.semantic_query || query;
  if (plan) {
    yield { type: "step", label: `Finding contacts related to ${describePlan(plan)}` };
  }

  const index = getSearchIndex();
  let hits = await index.search({ text: retrievalQuery, kinds: ["contact"], restrictTo });
  if (hits.length === 0 && restrictTo) {
    // Filters matched nobody — retry unfiltered rather than answering blind.
    hits = await index.search({ text: retrievalQuery, kinds: ["contact"] });
  }
  if (hits.length === 0) {
    yield {
      type: "notice",
      message: "Nothing in your graph matches that yet — the AI has no records to reason over.",
    };
    return;
  }

  yield {
    type: "step",
    label: `Ranking ${hits.length} ${hits.length === 1 ? "match" : "matches"}`,
  };

  try {
    const stream = await getLLMClient().streamComplete({
      system: SEARCH_ANSWER_SYSTEM,
      prompt: buildSearchAnswerPrompt(query, candidateBlocks(hits)),
      tier: "reason",
    });
    for await (const delta of stream.textStream) {
      yield { type: "answer", delta };
    }
    yield { type: "receipts", items: hits.slice(0, 5).map(toReceipt) };
    // Meter exactly once, on completion, from the resolved usage.
    await recordAiAction("search", stream.model, await stream.usage);
    yield { type: "done" };
  } catch (error) {
    yield toNoticeEvent(await aiFailureResult(error, query, hits));
  }
}
