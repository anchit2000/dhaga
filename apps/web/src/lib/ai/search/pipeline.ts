import {
  SEARCH_QUERY_SYSTEM,
  buildSearchQueryPrompt,
  getLLMClient,
  searchQueryPlanSchema,
  type SearchIndexResult,
  type SearchQueryPlan,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { getSearchIndex } from "@/lib/repo/search-index";
import { isTransientConnectionError } from "@/utils/constants/db";
import { AiBudgetError, recordAiAction } from "../metering";
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
export async function planQuery(
  userId: string,
  query: string,
): Promise<SearchQueryPlan | null> {
  try {
    const result = await getLLMClient().extract({
      schema: searchQueryPlanSchema,
      system: SEARCH_QUERY_SYSTEM,
      prompt: buildSearchQueryPrompt(query),
      tier: "extract",
    });
    // Recorded, but NOT as a second action: the caller has an open `search`
    // action, so this Haiku plan's tokens are added to that one row. It used to
    // go unmetered entirely (a search cost more than it billed) — the action
    // scope is what makes recording it safe from double-charging the cap.
    // Best-effort: a metering blip must not sink a search that already worked.
    try {
      await withUserDb(userId, () =>
        recordAiAction("search", result.model, result.usage),
      );
    } catch {
      // Same trade as the card scan: the call is billed upstream either way.
    }
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
  // Both monthly ceilings (credits, and the operator's dollar gate) mean "no
  // more AI until next month" — neither is retryable, so both degrade the same
  // way. Only "burst" falls through to the retry cue below.
  if (error instanceof AiBudgetError && error.kind !== "burst") {
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
  // Past the budget cases → a real infra/LLM fault behind the opaque "busy" /
  // "trouble" notices. Log it PII-free (error class / HTTP status / code /
  // transient flag only — never the message body, which could echo content) so
  // the failure is diagnosable instead of a black box. This is how the prod
  // Ask-Dhaga outage was traced to a DB connection held across the answer stream.
  console.error("[ask-dhaga] answer failure", {
    name: error instanceof Error ? error.name : typeof error,
    code: (error as { code?: unknown } | null)?.code,
    status: (error as { status?: unknown } | null)?.status,
    transient: isTransientConnectionError(error),
  });
  if (isTransientConnectionError(error)) {
    return { kind: "retry", notice: "Dhaga is busy right now — please try again in a moment." };
  }
  return { kind: "error", notice: "The AI had trouble answering. Please retry." };
}
