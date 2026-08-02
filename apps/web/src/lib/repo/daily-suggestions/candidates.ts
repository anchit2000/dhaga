import type { GraphFallbackCandidate } from "@/lib/repo/graph-fallback";
import type { DueReachOut, OpenFollowUpItem, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";
import type { CandidateFacts } from "./facts";
import type {
  SuggestionCandidate,
  SuggestionFollowUpEvidence,
  SuggestionImportantDateEvidence,
  SuggestionSignalEvidence,
} from "./types";

/**
 * Who is even in the running today. Merges the five sources (cadence, open
 * follow-ups, important dates, signals, graph fallback) into ONE row per
 * contact, so a person due on three counts is scored once with all three pieces
 * of evidence attached rather than appearing three times. PURE — the queries
 * happen in ./index.ts, which owns the sequential-await discipline.
 */

const DAY_MS = 86_400_000;

export interface CandidateEvidence {
  cadenceDue: boolean;
  followUp: SuggestionFollowUpEvidence | null;
  importantDate: SuggestionImportantDateEvidence | null;
  signal: SuggestionSignalEvidence | null;
}

function emptyEvidence(): CandidateEvidence {
  return { cadenceDue: false, followUp: null, importantDate: null, signal: null };
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

/**
 * Most-overdue-FIRST, which is not the oldest-touch-first order listDueReachOuts
 * returns (its own docblock names this: a yearly contact 400 days late has a
 * ratio of 0.09, a weekly one 8 days late has 1.14). Capping the unsorted list
 * would drop exactly the people the cadence term exists to surface.
 */
function byOverdueRatio(due: DueReachOut[], todayMs: number): DueReachOut[] {
  const ratio = (item: DueReachOut): number =>
    item.everyDays > 0 ? (todayMs - item.lastTouch.getTime()) / DAY_MS / item.everyDays : 0;
  return [...due].sort((a, b) => ratio(b) - ratio(a) || a.id.localeCompare(b.id));
}

/** Cadence carries no evidence object (everyDays + lastTouch come off the
 *  contact row in facts.ts) — only the assertion that this source found the
 *  contact due, which cadenceNorm in ./score.ts needs and must not lose. */
const markCadenceDue = (evidence: CandidateEvidence): void => {
  evidence.cadenceDue = true;
};

/** Only follow-ups DATED on or before the end of the user's today: an undated
 *  one is waiting, not due, and says nothing about today in particular. */
function dueByEndOfToday(followUps: OpenFollowUpItem[], todayMs: number): OpenFollowUpItem[] {
  const endOfDay = todayMs + DAY_MS;
  return followUps.filter((item) => item.dueDate !== null && item.dueDate.getTime() < endOfDay);
}

export function gatherCandidates(params: {
  due: DueReachOut[];
  followUps: OpenFollowUpItem[];
  importantDates: UpcomingImportantDate[];
  signals: SignalItem[];
  limit: number;
  todayMs: number;
}): Map<string, CandidateEvidence> {
  const map = new Map<string, CandidateEvidence>();
  const { limit, todayMs } = params;
  mergeSource(map, byOverdueRatio(params.due, todayMs), limit, (item) => item.id, markCadenceDue);
  mergeSource(
    map,
    dueByEndOfToday(params.followUps, todayMs),
    limit,
    (item) => item.contactId,
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
