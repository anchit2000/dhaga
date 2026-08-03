import { GOAL_MATCH_BATCH_KEY, getPendingBatchId } from "@/lib/repo/settings";

/**
 * The nightly match pass's settings pointer, "<batchId>|<goalId>".
 *
 * THE POINTER CARRIES THE GOAL, not just the batch id: a batch judged against
 * one objective can land on a night when the user has already reworded or
 * archived that goal, and without the goal id the results would be filed under
 * whatever is active now — members matched against wording the user never
 * asked about. Anthropic caps `custom_id` at 64 characters, so two UUIDs will
 * not fit there and the goal id rides here instead, staying opaque to
 * lib/repo/settings.
 *
 * Parsed HERE rather than inside the job because the read side needs it too:
 * "a top-up is still in flight for this goal" is one of the states the Home
 * strip has to tell apart from "nothing has run" (./cohort.ts).
 */

export interface GoalMatchPointer {
  batchId: string;
  goalId: string;
}

export function formatGoalMatchPointer(batchId: string, goalId: string): string {
  return `${batchId}|${goalId}`;
}

/** Anything malformed reads as NO pending batch — the pass then just submits a
 *  fresh one, which is the safe direction to fail in. */
export function parseGoalMatchPointer(value: string): GoalMatchPointer | null {
  const separator = value.indexOf("|");
  if (separator <= 0) return null;
  const goalId = value.slice(separator + 1);
  return goalId ? { batchId: value.slice(0, separator), goalId } : null;
}

/** The pointer as stored, or null when there is no (usable) pending batch. */
export async function readGoalMatchPointer(): Promise<GoalMatchPointer | null> {
  const value = await getPendingBatchId(GOAL_MATCH_BATCH_KEY);
  return value ? parseGoalMatchPointer(value) : null;
}
