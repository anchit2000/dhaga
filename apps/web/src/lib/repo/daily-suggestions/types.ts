// Split per the 150-line rule; import paths unchanged (@/lib/repo/daily-suggestions).
// This file owns the contract: the public shapes Home and the daily-digest email
// consume, plus the internal pre-scoring candidate — so candidate gathering, the
// scorer and the reason builder can each be their own file without importing
// one another.

import type { SUGGESTION_WEIGHTS } from "@/utils/constants/suggestions";

/**
 * Which source put a person on today's list. "daily", "cadence" and "graph"
 * keep the exact meaning they had before scoring existed; the rest name the
 * sources the unified score added.
 */
export type SuggestionBucket =
  | "daily"
  | "cadence"
  | "follow-up"
  | "date"
  | "goal"
  | "signal"
  | "quiet"
  | "graph";

/**
 * The buckets that mean "this person is due to be reached out to", as opposed
 * to a discretionary suggestion. Home counted these with `bucket !== "graph"`,
 * which quietly starts counting signal/quiet/date rows as "due" the moment a
 * new bucket lands — check membership here instead of negating one value.
 */
export const CADENCE_BUCKETS: ReadonlySet<SuggestionBucket> = new Set<SuggestionBucket>([
  "daily",
  "cadence",
]);

/**
 * One row of the "reach out to these people today" list. Consumed by Home and
 * by the daily-digest email (lib/email/daily-digest.ts, lib/jobs/daily-digest.ts)
 * — the score itself stays internal, so the digest never has to explain a number.
 */
export interface DailySuggestion {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  bucket: SuggestionBucket;
  reason: string;
  everyDays: number | null;
  lastTouch: Date | null;
}

export interface DailySuggestionResult {
  suggestions: DailySuggestion[];
  count: number;
}

/**
 * The scoring terms, keyed off the weights so a new term cannot be added to one
 * without the other.
 */
export type SuggestionTermId = keyof typeof SUGGESTION_WEIGHTS;

/** What a term contributed to a candidate's score. The reason builder picks the
 *  winner from these, so the copy shown is derived from the numbers that ranked. */
export interface ScoredTerm {
  id: SuggestionTermId;
  points: number;
}

/** The open follow-up that made this candidate due, if any. */
export interface SuggestionFollowUpEvidence {
  action: string;
  /** null when the follow-up was captured without a date. */
  dueDate: Date | null;
  createdAt: Date;
}

/** The nearest upcoming birthday/anniversary/… for this candidate, if any. */
export interface SuggestionImportantDateEvidence {
  /** Verbatim from the entry: "Birthday", "Work anniversary", … */
  label: string;
  /** 0 = today; never negative (only future occurrences are gathered). */
  daysUntil: number;
}

/**
 * This candidate's place in the active goal's cohort, if any. Deliberately NOT
 * in CADENCE_BUCKETS above: a goal row is discretionary, not due, so it must
 * never inflate Home's "+N more due" footer.
 */
export interface SuggestionGoalEvidence {
  /** The user's own words, verbatim from the goal. */
  objective: string;
  /** The match pass's fit 0..100, frozen at match time. */
  rank: number;
  /** Cohort members not yet reached out to — a SQL count, not an estimate. */
  remaining: number;
}

/** The newest undismissed signal for this candidate, if any. */
export interface SuggestionSignalEvidence {
  headline: string;
  createdAt: Date;
}

/**
 * A person under consideration for today, with every input the scorer and the
 * reason builder need already attached — nothing below this point touches the
 * database, so scoring stays a pure function over gathered rows.
 */
export interface SuggestionCandidate {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  starred: boolean;
  /** Keep-in-touch period in days, or null when no cadence is set. */
  everyDays: number | null;
  /**
   * The cadence source asserted this contact is due. Carried as an INPUT FACT
   * because that assertion was made against SQL `now()`, while the scorer works
   * from the user's local midnight — see cadenceNorm in ./score.ts.
   */
  cadenceDue: boolean;
  /** Newest touch, falling back to contact creation — so never null. */
  lastTouch: Date;
  /** Non-deleted edges touching the contact; 0 for an isolated one. */
  degree: number;
  followUp: SuggestionFollowUpEvidence | null;
  importantDate: SuggestionImportantDateEvidence | null;
  goal: SuggestionGoalEvidence | null;
  signal: SuggestionSignalEvidence | null;
}
