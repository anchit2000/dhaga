import type { SearchIndexResult, SearchQueryPlan } from "@dhaga/core";
import { getSearchIndex } from "@/lib/repo/search-index";
import { contactIdsForPlan } from "@/lib/repo/search-filters";
import type { AiAnswerResult, SearchReceipt, SearchStreamEvent } from "../types";

/**
 * Retrieve the answer candidates. Callers wrap this in `withUserDb` so the
 * tenant connection it uses is released before the model round-trip — holding a
 * pool slot across the ~30s Sonnet answer is what saturated the small pool and
 * timed Ask-Dhaga out in production.
 */
export async function retrieveHits(
  plan: SearchQueryPlan | null,
  retrievalQuery: string,
): Promise<SearchIndexResult[]> {
  const restrictTo = plan ? await contactIdsForPlan(plan) : undefined;
  const index = getSearchIndex();
  const found = await index.search({ text: retrievalQuery, kinds: ["contact"], restrictTo });
  if (found.length === 0 && restrictTo) {
    // Filters matched nobody — retry unfiltered rather than answering blind.
    return index.search({ text: retrievalQuery, kinds: ["contact"] });
  }
  return found;
}

/** A short, honest descriptor of what the plan scoped to, for a step label —
 *  the structured filters if any, else the semantic residual. */
export function describePlan(plan: SearchQueryPlan): string {
  const signals = [...plan.tags, plan.company ?? "", plan.event ?? ""].filter(
    (signal) => signal.trim().length > 0,
  );
  if (signals.length > 0) return signals.join(", ");
  return plan.semantic_query.trim() || "your question";
}

export function toReceipt(hit: SearchIndexResult): SearchReceipt {
  return { id: hit.id, label: hit.label, sublabel: hit.sublabel };
}

/** Maps an aiFailureResult into the stream's single terminal notice event. */
export function toNoticeEvent(failure: AiAnswerResult): SearchStreamEvent {
  return {
    type: "notice",
    message: failure.notice ?? "The AI had trouble answering. Please retry.",
    kind: failure.kind,
    hits: failure.hits,
  };
}
