import { isMeteredSearchClient, type SearchClient, type SearchResponse } from "@dhaga/core";
import { recordAiAction } from "@/lib/ai/metering";
import type { ScopedRunner } from "./index";

/** Results fed to the classifier per contact. Matches the search gateway's own
 *  default, so swapping providers doesn't change how much the classifier sees. */
export const SEARCH_RESULT_LIMIT = 5;

/**
 * One search for one contact, plus whatever it cost. A provider that can't
 * report a cost (Firecrawl, SearXNG — see MeteredSearchClient's doc comment in
 * packages/core/src/search/types.ts) yields zero usage rather than a fabricated
 * one, so adding such a provider still needs no change to the sweep.
 */
export async function searchOne(client: SearchClient, query: string): Promise<SearchResponse> {
  if (isMeteredSearchClient(client)) {
    return client.searchMetered(query, { limit: SEARCH_RESULT_LIMIT });
  }
  return {
    results: await client.search(query, { limit: SEARCH_RESULT_LIMIT }),
    usage: { searches: 0 },
  };
}

/**
 * Meter the SEARCH phase of the sweep.
 *
 * Only providers that run search through a model report a cost
 * (AnthropicSearchClient does; Firecrawl's flat subscription is outside our
 * metering entirely), and those tokens are a real Anthropic bill: every
 * retrieved page is charged as input to the searching model. Left unrecorded,
 * the instance dollar ceiling (lib/ai/metering/dollar-cap.ts) would never see
 * the more expensive half of this job — the half BRD §8.3 names as the main
 * cost driver.
 *
 * ONE ROW PER SEARCH, at signal_detection's price of 0 credits — so this
 * changes no user's credit balance, only what the dollar gate and the admin
 * cost screen can see. It does mean a watched contact produces TWO rows per
 * cycle (this search, then the classification in the next run's
 * ./process-pending-batch): they are separated by a day AND a process, so there
 * is no `withAiAction` scope that could fold them into one action.
 *
 * NOT captured: Anthropic bills $10 per 1,000 searches ON TOP of these tokens,
 * and `ai_actions` has no column for a charge that isn't tokens. That is a real
 * under-report of ~$0.01 per watched contact per cycle — flagged in
 * packages/core/src/metering/credits/table.ts, not silently absorbed.
 *
 * Runs as its own scoped unit AFTER the searches, never around them, so no DB
 * connection is held across the network I/O.
 */
export async function recordSearchCost(
  runScoped: ScopedRunner,
  costs: SearchResponse["usage"][],
): Promise<void> {
  const billable = costs.filter((cost) => cost.model && cost.tokens);
  if (billable.length === 0) return;
  await runScoped(async () => {
    for (const cost of billable) {
      // Narrowed by the filter above; repeated for the type checker.
      if (cost.model && cost.tokens) {
        await recordAiAction("signal_detection", cost.model, cost.tokens);
      }
    }
  });
}
