import type { GoalCohortSlice } from "@/lib/repo/goals";
import type { SuggestionGoalEvidence } from "../types";

/**
 * Flattens today's goal slice into per-contact nominations, so ./index.ts folds
 * it in exactly like every other source. PURE — the query happens in ../index.ts,
 * which owns the sequential-await discipline. Split out per the 150-line rule,
 * alongside ./order's per-source transforms.
 *
 * The slice envelope carries `objective` and `remaining` once; every nomination
 * repeats them because the reason builder works from ONE candidate and has no
 * way to reach back to the goal (../reason.ts is pure).
 */

export interface GoalNomination {
  contactId: string;
  evidence: SuggestionGoalEvidence;
}

export function goalNominations(slice: GoalCohortSlice | null): GoalNomination[] {
  if (!slice) return [];
  return slice.members.map((member) => ({
    contactId: member.contactId,
    evidence: { objective: slice.objective, rank: member.rank, remaining: slice.remaining },
  }));
}
