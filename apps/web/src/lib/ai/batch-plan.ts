import {
  BATCH_PLAN_SYSTEM,
  batchPlanSchema,
  buildBatchPlanPrompt,
  getLLMClient,
  hasLLM,
  type BatchPlan,
  type BatchPlanCandidate,
  type BatchPlanItem,
} from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { userToday } from "@/lib/repo/reminders/local-today";
import { assertAiBudget, recordAiAction, withAiAction } from "./metering";

/** Raised when a batch cannot be planned. The caller must leave the batch
 *  UNPROCESSED and retryable rather than degrade to a per-message walk — a
 *  silent fallback would resurrect exactly the mis-attribution this replaced. */
export class BatchPlanUnavailableError extends Error {
  constructor(
    message: string,
    /** PII-free, safe to persist on the session row and show in the capture log. */
    readonly reason: string,
  ) {
    super(message);
    this.name = "BatchPlanUnavailableError";
  }
}

/**
 * Plan a whole forwarded batch in ONE structured-output call: who it is about,
 * what to store on each person, and what is genuinely too ambiguous to file.
 *
 * This replaces the per-message extraction walk. Planning the batch as a whole
 * is the point — a message like "Create a new contact" only means anything
 * beside the message before it, and the old walk could never see both at once
 * (see packages/core/src/schemas/batch-plan.ts for the failure it caused).
 *
 * NO heuristic fallback, deliberately, unlike quick-add's contact extraction:
 * an offline parse cannot do cross-message attribution at all, so falling back
 * would quietly produce the wrong graph. Without an LLM the batch stays put and
 * the sender is told to retry — nothing is written on a guess.
 *
 * Never logs the batch content (contact PII); only PII-free metadata escapes.
 */
export async function planMessagingBatch(
  userId: string,
  items: readonly BatchPlanItem[],
  candidates: readonly BatchPlanCandidate[],
): Promise<BatchPlan> {
  if (!hasLLM()) {
    throw new BatchPlanUnavailableError(
      "No LLM is configured, so this batch cannot be planned.",
      "no_llm",
    );
  }
  // One batch = one metered action, whatever the plan costs to produce.
  return withAiAction("batch_plan", () => planWithAi(userId, items, candidates));
}

async function planWithAi(
  userId: string,
  items: readonly BatchPlanItem[],
  candidates: readonly BatchPlanCandidate[],
): Promise<BatchPlan> {
  // Budget check and the user's calendar day in their OWN short scope, released
  // before the model call, so no tenant connection is held across the
  // multi-second Anthropic round-trip (SCALING.md lever 2 / the #92 pool bug).
  // The batch walk runs in a background after(), where a pinned connection is
  // even more costly than in a request.
  const today = await withUserDb(userId, async () => {
    await assertAiBudget(userId);
    return userToday();
  });
  const result = await getLLMClient().extract({
    schema: batchPlanSchema,
    system: BATCH_PLAN_SYSTEM,
    prompt: buildBatchPlanPrompt(items, candidates, today),
    tier: "extract",
  });
  await withUserDb(userId, () => recordAiAction("batch_plan", result.model, result.usage));
  return result.data;
}
