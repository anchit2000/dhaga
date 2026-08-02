import { dayLoad, type BusyInterval } from "@dhaga/core";
import {
  MIN_SUGGESTIONS_ON_BUSY_DAY,
  SUGGESTION_SOURCE_LIMIT_FACTOR,
} from "@/utils/constants/suggestions";
import { listGraphFallbackCandidates } from "@/lib/repo/graph-fallback";
import { listAllOpenFollowUps, listDueReachOuts, listUpcomingImportantDates } from "@/lib/repo/reminders";
import { listNewSignals } from "@/lib/repo/signals";
import {
  getDailySuggestionCount,
  getImportantDateLeadDays,
  getSchedulePrefs,
  type SchedulePrefs,
} from "@/lib/repo/suggestion-settings";
import { buildCandidates, gatherCandidates, mergeGraphCandidates } from "./candidates";
import { getCandidateFacts } from "./facts";
import { describeSuggestion } from "./reason";
import { compareScored, scoreCandidate, type ScoredCandidate } from "./score";
import type { DailySuggestion, DailySuggestionResult } from "./types";
import type { DueReachOut, OpenFollowUpItem } from "@/lib/repo/reminders";
import type { SignalItem } from "@/lib/repo/signals";

/**
 * The unified "reach out to these N people today" engine. Five sources —
 * keep-in-touch cadence, open follow-ups, important dates, watchlist signals and
 * graph degree — nominate candidates; ONE additive score (./score.ts) then ranks
 * them all against each other, and the winning term names the row (./reason.ts).
 * There are no priority buckets: a birthday today can outrank a cadence that
 * came due this morning, which the old first-come-first-served ordering could
 * never express. Fully deterministic given its inputs and quantized to the
 * user's local midnight, so the list is identical on every render within a day —
 * no AI (CLAUDE.md Rule 5), no stored score, no nightly precompute.
 *
 * Every await here is SEQUENTIAL, never Promise.all: the tenant connection pool
 * tops out at 3 and fanning getDb() out causes production 500s (see
 * lib/repo/reminders/local-today.ts).
 */

const DAY_MS = 86_400_000;

/** Absolute instant of the local midnight at or before `nowMs`. */
function localMidnight(nowMs: number, offsetMs: number): number {
  const local = new Date(nowMs + offsetMs);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
}

function toSuggestion(scored: ScoredCandidate, todayMs: number): DailySuggestion {
  const { candidate } = scored;
  const { bucket, reason } = describeSuggestion(scored, todayMs);
  return {
    contactId: candidate.contactId,
    name: candidate.name,
    title: candidate.title,
    companyName: candidate.companyName,
    bucket,
    reason,
    everyDays: candidate.everyDays,
    lastTouch: candidate.lastTouch,
  };
}

export async function buildDailySuggestions(
  options: {
    date?: Date;
    count?: number;
    prefs?: SchedulePrefs;
    busy?: BusyInterval[];
    /** Injection slots for lists the caller already fetched — Home reads all
     *  three for other tiles, so passing them costs it zero extra queries. */
    due?: DueReachOut[];
    followUps?: OpenFollowUpItem[];
    signals?: SignalItem[];
  } = {},
): Promise<DailySuggestionResult> {
  const now = options.date ?? new Date();
  const count = options.count ?? (await getDailySuggestionCount());
  const prefs = options.prefs ?? (await getSchedulePrefs());
  const busy = options.busy ?? [];
  const todayMs = localMidnight(now.getTime(), prefs.utcOffsetMinutes * 60_000);

  const due = options.due ?? (await listDueReachOuts());
  const followUps = options.followUps ?? (await listAllOpenFollowUps());
  const signals = options.signals ?? (await listNewSignals());
  const leadDays = await getImportantDateLeadDays();
  const importantDates = await listUpcomingImportantDates(leadDays, now);

  const limit = count * SUGGESTION_SOURCE_LIMIT_FACTOR;
  const evidence = gatherCandidates({ due, followUps, importantDates, signals, limit, todayMs });
  mergeGraphCandidates(evidence, await listGraphFallbackCandidates([...evidence.keys()], limit));
  const facts = await getCandidateFacts([...evidence.keys()]);

  const dayIndex = Math.floor(todayMs / DAY_MS);
  const scored = buildCandidates(evidence, facts)
    .map((candidate) => scoreCandidate(candidate, todayMs, dayIndex))
    .sort(compareScored);

  // A calendar-heavy day gets a shorter list, floored at one: a busy day must
  // never silence Today entirely. Unlike before, daily check-ins are no longer
  // added ahead of this subtraction — the list is urgency-ordered now, so a due
  // check-in is already at the top and survives any trim.
  const load = dayLoad({ day: now, busy, utcOffsetMinutes: prefs.utcOffsetMinutes });
  const capacity = Math.min(count, Math.max(MIN_SUGGESTIONS_ON_BUSY_DAY, count - load.meetingCount));
  return { suggestions: scored.slice(0, capacity).map((item) => toSuggestion(item, todayMs)), count };
}

// Import paths stay stable via this barrel: @/lib/repo/daily-suggestions.
export { CADENCE_BUCKETS } from "./types";
export type {
  DailySuggestion,
  DailySuggestionResult,
  ScoredTerm,
  SuggestionBucket,
  SuggestionCandidate,
  SuggestionFollowUpEvidence,
  SuggestionImportantDateEvidence,
  SuggestionSignalEvidence,
  SuggestionTermId,
} from "./types";
export { compareScored, hashId, scoreCandidate, type ScoredCandidate } from "./score";
export { describeSuggestion, type SuggestionCopy } from "./reason";
