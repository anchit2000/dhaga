import { count, eq } from "drizzle-orm";
import {
  GOAL_MATCHING_SYSTEM,
  buildGoalMatchingPrompt,
  goalMatchSchema,
  type BatchExtractItem,
  type BatchLLMClient,
  type GoalMatch,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { goalMembers } from "@/lib/db/schema";
import { getActiveGoal, recallGoalCandidates } from "@/lib/repo/goals";
import { userToday } from "@/lib/repo/reminders/local-today";
import { GOAL_COHORT_MAX, GOAL_MATCH_RUN_CAP } from "@/utils/constants/goals";
import { GOAL_MATCH_BATCH_KEY, setPendingBatchId } from "@/lib/repo/settings";
import { loadGoalSubjectContext } from "./subjects";
import type { ScopedRunner } from "@/lib/jobs/tenant-sweep";
import type { GoalMatchSummary } from "./index";

/**
 * Phase 2: recall candidates for the active goal (deterministically — no LLM in
 * the retrieval step, Rule 5) and submit one batch of match judgments for the
 * next run to apply. `custom_id` is the contact id; the goal id travels on the
 * settings pointer instead (see ./index — Anthropic caps custom_id at 64 chars,
 * which two UUIDs exceed).
 *
 * `matchedSoFar` is what phase 1 already inserted this run; carried through.
 */
export async function submitNewBatch(
  runScoped: ScopedRunner,
  batchClient: BatchLLMClient,
  matchedSoFar: number,
): Promise<GoalMatchSummary> {
  const prepared = await runScoped(async () => {
    const goal = await getActiveGoal();
    if (!goal) return null;
    // Retrieval, ranking pool and cohort headroom are all decided by
    // recallGoalCandidates (it already excludes existing members and
    // non-surfaceable rows). GOAL_MATCH_RUN_CAP is the cost fuse on top of it.
    const candidates = (await recallGoalCandidates(goal.objective, goal.id)).slice(
      0,
      GOAL_MATCH_RUN_CAP,
    );
    const context = await loadGoalSubjectContext(candidates);
    const today = await userToday();
    const db = await getDb();
    const [cohort] = await db
      .select({ total: count() })
      .from(goalMembers)
      .where(eq(goalMembers.goalId, goal.id));
    return { goal, candidates, context, today, cohortSize: cohort?.total ?? 0 };
  });

  if (!prepared) return { scanned: 0, matched: matchedSoFar, remaining: 0, skipped: "no_goal" };
  const { goal, candidates, context, today, cohortSize } = prepared;

  const items: BatchExtractItem<GoalMatch>[] = [];
  for (const candidate of candidates) {
    const subject = context.get(candidate.contactId);
    if (!subject) continue; // recalled row vanished between the two reads
    items.push({
      id: candidate.contactId,
      schema: goalMatchSchema,
      system: GOAL_MATCHING_SYSTEM,
      // The objective goes in VERBATIM — the user's phrasing is the whole
      // specification. Per-contact context caps are applied inside the builder.
      prompt: buildGoalMatchingPrompt(
        goal.objective,
        {
          name: candidate.name,
          title: candidate.title,
          company: candidate.companyName,
          ...subject,
        },
        today,
      ),
      tier: "extract",
    });
  }

  if (items.length > 0) {
    // Submit FIRST, then persist the pointer — same ordering as detect-signals:
    // if the submit throws there is no pointer to a batch that does not exist,
    // and the same candidates are simply recalled again next run (the pass is
    // idempotent because recall excludes contacts already matched).
    const batchId = await batchClient.submitExtractBatch(items);
    await runScoped(() => setPendingBatchId(GOAL_MATCH_BATCH_KEY, `${batchId}|${goal.id}`));
  }

  return {
    scanned: items.length,
    matched: matchedSoFar,
    remaining: Math.max(GOAL_COHORT_MAX - cohortSize, 0),
    skipped: null,
  };
}
