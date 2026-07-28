import {
  SEARCH_ANSWER_SYSTEM,
  buildSearchAnswerPrompt,
  getLLMClient,
  hasLLM,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { assertAiBudget, recordAiAction } from "../../metering";
import { aiFailureResult, candidateBlocks, planQuery } from "../pipeline";
import { describePlan, retrieveHits, toNoticeEvent, toReceipt } from "./helpers";
import type { AiAnswerResult, SearchStreamEvent } from "../types";

/**
 * M6 full pipeline: understand the query (Haiku) → retrieve (structured
 * filters + hybrid keyword/semantic, all local) → answer with receipts
 * (Sonnet). Stage 1 failing degrades to unfiltered retrieval, never to a broken
 * search. Non-streaming; the Telegram webhook (no client to stream to) and any
 * batch caller use this — the palette uses streamSearchAnswer.
 *
 * Every DB touch (budget, retrieval, metering) runs in its own short-lived
 * `withUserDb` scope so no tenant-pool connection is held across the model
 * round-trip; see ./helpers retrieveHits.
 */
export async function answerSearchQuery(
  userId: string,
  query: string,
): Promise<AiAnswerResult> {
  if (!hasLLM()) {
    return { notice: "Configure an LLM provider to get AI answers over your graph." };
  }
  try {
    await withUserDb(userId, () => assertAiBudget(userId));
  } catch (error) {
    // Hits aren't retrieved yet here; the cap fallback pulls its own (needs DB).
    return withUserDb(userId, () => aiFailureResult(error, query, null));
  }

  const plan = await planQuery(query);
  const hits = await withUserDb(userId, () => retrieveHits(plan, query));
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
    await withUserDb(userId, () => recordAiAction("search", result.model, result.usage));
    return { answer: result.data };
  } catch (error) {
    return withUserDb(userId, () => aiFailureResult(error, query, hits));
  }
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
    await withUserDb(userId, () => assertAiBudget(userId));
  } catch (error) {
    yield toNoticeEvent(await withUserDb(userId, () => aiFailureResult(error, query, null)));
    return;
  }

  const plan = await planQuery(query);
  if (plan) {
    yield { type: "step", label: `Finding contacts related to ${describePlan(plan)}` };
  }

  const hits = await withUserDb(userId, () => retrieveHits(plan, query));
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
    // Meter exactly once, on completion, from a fresh short-lived checkout.
    const usage = await stream.usage;
    await withUserDb(userId, () => recordAiAction("search", stream.model, usage));
    yield { type: "done" };
  } catch (error) {
    yield toNoticeEvent(await withUserDb(userId, () => aiFailureResult(error, query, hits)));
  }
}
