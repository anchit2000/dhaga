import type { SearchIndexResult, SearchQueryPlan } from "@dhaga/core";
import { getSearchIndex } from "@/lib/repo/search-index";
import { contactIdsForPlan } from "@/lib/repo/search-filters";
import type { AiAnswerResult, SearchReceipt, SearchStreamEvent } from "../types";

/**
 * Retrieve the answer candidates. Callers wrap this in `withUserDb` so the
 * tenant connection it uses is released before the model round-trip — holding a
 * pool slot across the ~30s Sonnet answer is what saturated the small pool and
 * timed Ask-Dhaga out in production.
 *
 * The plan's structured filters (company/event/tags from the Haiku stage) must
 * *widen* recall, never gate it. Applied as a hard `restrictTo`, a lossy plan
 * silently buried real matches: "Who do I know in MIT" was mis-extracted as tag
 * `education`, which happened to match one unrelated contact — a non-empty but
 * wrong result, so the old empty-only fallback never fired and every genuine MIT
 * contact (MIT in a note, in a name, or as the linked company) was dropped
 * before the model saw anything. So we always search the whole graph on the
 * *literal* question — proper nouns like "MIT" survive here but can be lost in
 * the LLM's rephrased `semantic_query` — and merge the filter-scoped hits on top
 * as an additive boost rather than intersecting them.
 */
export async function retrieveHits(
  plan: SearchQueryPlan | null,
  query: string,
): Promise<SearchIndexResult[]> {
  const index = getSearchIndex();
  const restrictTo = plan ? await contactIdsForPlan(plan) : undefined;
  const retrievalQuery = plan?.semantic_query.trim() || query;

  const [broad, scoped] = await Promise.all([
    index.search({ text: query, kinds: ["contact"] }),
    restrictTo && restrictTo.size > 0
      ? index.search({ text: retrievalQuery, kinds: ["contact"], restrictTo })
      : Promise.resolve<SearchIndexResult[]>([]),
  ]);
  return mergeHits(broad, scoped);
}

/**
 * Merge candidate lists by contact id. A contact matching both the literal
 * question and the structured filter sums both scores (a correct filter lifts
 * its members up the ranking); a filter-only match keeps its own score and
 * competes on merit — so a wrong filter can no longer bury the real matches.
 * Re-ranked and capped at 20, mirroring hybridSearch's own cap.
 */
function mergeHits(...groups: SearchIndexResult[][]): SearchIndexResult[] {
  const byId = new Map<string, SearchIndexResult>();
  for (const hit of groups.flat()) {
    const existing = byId.get(hit.id);
    if (!existing) {
      byId.set(hit.id, { ...hit });
    } else {
      existing.score += hit.score;
      if ((existing.matches?.length ?? 0) === 0 && hit.matches?.length) {
        existing.matches = hit.matches;
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 20);
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
