import { GOAL_DAILY_SLICE } from "@/utils/constants/goals";
import { goalNominations, type GoalNomination } from "./goal";
import { byOverdueRatio, dueByEndOfToday } from "./order";
import type { GoalCohortSlice } from "@/lib/repo/goals";
import type { GraphFallbackCandidate } from "@/lib/repo/graph-fallback";
import type { DueReachOut, OpenFollowUpItem, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { CandidateFacts } from "../facts";
import type {
  SuggestionCandidate,
  SuggestionFollowUpEvidence,
  SuggestionGoalEvidence,
  SuggestionImportantDateEvidence,
  SuggestionSignalEvidence,
} from "../types";

/**
 * Who is even in the running today. Merges the six sources (cadence, open
 * follow-ups, important dates, the goal cohort, signals, graph fallback) into
 * ONE row per contact, so a person due on three counts is scored once with all
 * three pieces of evidence attached rather than appearing three times. PURE —
 * the queries happen in ../index.ts, which owns the sequential-await discipline.
 *
 * Split per the 150-line rule; import paths unchanged
 * (@/lib/repo/daily-suggestions/candidates). The per-source eligibility/ordering
 * transforms live in ./order and ./goal.
 */

export { byOverdueRatio, dueByEndOfToday };

export interface CandidateEvidence {
  cadenceDue: boolean;
  followUp: SuggestionFollowUpEvidence | null;
  importantDate: SuggestionImportantDateEvidence | null;
  goal: SuggestionGoalEvidence | null;
  signal: SuggestionSignalEvidence | null;
}

function emptyEvidence(): CandidateEvidence {
  return { cadenceDue: false, followUp: null, importantDate: null, goal: null, signal: null };
}

/**
 * Folds one source in, capped at `limit` CONTACTS from that source (not rows) —
 * each source is already ordered most-relevant-first, so the first row per
 * contact is the one worth keeping and the rest of that source is off-list.
 */
function mergeSource<T>(
  map: Map<string, CandidateEvidence>,
  items: T[],
  limit: number,
  contactId: (item: T) => string,
  apply: (evidence: CandidateEvidence, item: T) => void,
): void {
  const taken = new Set<string>();
  for (const item of items) {
    if (taken.size >= limit) break;
    const id = contactId(item);
    if (taken.has(id)) continue;
    taken.add(id);
    const evidence = map.get(id) ?? emptyEvidence();
    apply(evidence, item);
    map.set(id, evidence);
  }
}

/** Cadence carries no evidence object (everyDays + lastTouch come off the
 *  contact row in facts.ts) — only the assertion that this source found the
 *  contact due, which cadenceNorm in ../score.ts needs and must not lose. */
const markCadenceDue = (evidence: CandidateEvidence): void => {
  evidence.cadenceDue = true;
};

/** ./goal already flattened the slice per contact; folding it in is a plain set. */
const byContactId = (item: GoalNomination): string => item.contactId;
const applyGoal = (evidence: CandidateEvidence, item: GoalNomination): void => {
  evidence.goal = item.evidence;
};

export function gatherCandidates(params: {
  due: DueReachOut[];
  followUps: OpenFollowUpItem[];
  importantDates: UpcomingImportantDate[];
  goal: GoalCohortSlice | null;
  signals: SignalItem[];
  limit: number;
  todayMs: number;
}): Map<string, CandidateEvidence> {
  const map = new Map<string, CandidateEvidence>();
  const { limit, todayMs } = params;
  mergeSource(map, byOverdueRatio(params.due, todayMs), limit, (item) => item.id, markCadenceDue);
  mergeSource(
    map,
    dueByEndOfToday(params.followUps, todayMs).filter((item) => item.contactId !== null),
    limit,
    (item) => item.contactId!,
    (evidence, item) => {
      evidence.followUp = { action: item.action, dueDate: item.dueDate, createdAt: item.createdAt };
    },
  );
  mergeSource(
    map,
    params.importantDates,
    limit,
    (item) => item.contactId,
    (evidence, item) => {
      evidence.importantDate = { label: item.label, daysUntil: item.daysUntil };
    },
  );
  // Capped at GOAL_DAILY_SLICE, not `limit`: a goal is the one source that
  // could otherwise nominate its whole cohort.
  mergeSource(map, goalNominations(params.goal), GOAL_DAILY_SLICE, byContactId, applyGoal);
  mergeSource(
    map,
    params.signals,
    limit,
    (item) => item.contactId,
    (evidence, item) => {
      evidence.signal = { headline: item.headline, createdAt: item.createdAt };
    },
  );
  return map;
}

/** The fifth source: well-connected people no event nominated. Already excluded
 *  from the map's keys by the caller's query, so this only ever adds. */
export function mergeGraphCandidates(
  map: Map<string, CandidateEvidence>,
  pool: GraphFallbackCandidate[],
): void {
  for (const item of pool) {
    if (!map.has(item.contactId)) map.set(item.contactId, emptyEvidence());
  }
}

/** Joins evidence to facts. An id with no facts row was a note-mention stub (or
 *  was deleted mid-request) and drops out — filtered once, in facts.ts. */
export function buildCandidates(
  evidence: Map<string, CandidateEvidence>,
  facts: Map<string, CandidateFacts>,
): SuggestionCandidate[] {
  const candidates: SuggestionCandidate[] = [];
  for (const [contactId, item] of evidence) {
    const row = facts.get(contactId);
    if (!row) continue;
    candidates.push({ ...row, ...item });
  }
  return candidates;
}
