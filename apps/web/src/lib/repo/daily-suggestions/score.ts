import { STRENGTH_HALF_LIFE_DAYS } from "@/utils/constants/app";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import {
  SUGGESTION_CADENCE_BASE,
  SUGGESTION_DEGREE_SATURATION,
  SUGGESTION_FOLLOW_UP_BASE,
  SUGGESTION_GOAL_BASE,
  SUGGESTION_SIGNAL_HALF_LIFE_DAYS,
  SUGGESTION_WEIGHTS,
} from "@/utils/constants/suggestions";
import type { ScoredTerm, SuggestionCandidate, SuggestionTermId } from "./types";

/**
 * The unified score: one number per candidate, `Math.round(Σ weight × norm)`.
 * PURE — no database, and deliberately no clock: `todayMs` (the user's local
 * midnight) and `dayIndex` are parameters, so every render inside a day scores
 * byte-identically. Reading the wall clock here would reshuffle Today under the
 * user mid-session as decay terms crept.
 */

const DAY_MS = 86_400_000;
const UINT32 = 2 ** 32;

/** FNV-1a — a small, stable string hash (no crypto, no randomness). Copied from
 *  packages/core/src/calendar/spread.ts rather than widening that package's
 *  public API; same algorithm, so stable ordering matches the existing idiom. */
export function hashId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface ScoredCandidate {
  candidate: SuggestionCandidate;
  score: number;
  /** Every term, zeros included, so the reason builder reads the same numbers
   *  that did the ranking and cannot label a row by a term that didn't rank it. */
  terms: ScoredTerm[];
}

function daysSince(date: Date, todayMs: number): number {
  return Math.max(0, (todayMs - date.getTime()) / DAY_MS);
}

/**
 * Being due already earns the base; the remainder ramps with how overdue.
 *
 * `candidate.cadenceDue` FLOORS the norm at the base, and that floor is load-
 * bearing — do not "simplify" it back to a bare `daysOverdue > 0` check. The
 * cadence source asserts due-ness against SQL `now()`, while this function
 * measures from the user's local MIDNIGHT (it has to: reading a clock here would
 * reshuffle Today under the user mid-session). The two disagree for any contact
 * whose interval elapses later today — it is in the due list, yet `daysOverdue`
 * is still negative. Without the floor it scores 0 on cadence and gets labelled
 * by its next-best term: "No contact since 12 Jun" on a row the user explicitly
 * asked to be reminded about. Presence in the source IS the assertion; honour it.
 */
function cadenceNorm(candidate: SuggestionCandidate, todayMs: number): number {
  const everyDays = candidate.everyDays;
  if (everyDays === null || everyDays <= 0) return 0;
  const daysOverdue = daysSince(candidate.lastTouch, todayMs) - everyDays;
  if (!candidate.cadenceDue && daysOverdue <= 0) return 0;
  const overdueRamp = Math.min(Math.max(daysOverdue, 0) / everyDays, 1);
  return SUGGESTION_CADENCE_BASE + (1 - SUGGESTION_CADENCE_BASE) * overdueRamp;
}

/** Only a DATED follow-up falling on or before the end of the user's today
 *  counts: an undated one says nothing about whether today is the day. */
function followUpNorm(candidate: SuggestionCandidate, todayMs: number): number {
  const dueDate = candidate.followUp?.dueDate;
  if (!dueDate || dueDate.getTime() >= todayMs + DAY_MS) return 0;
  const daysLate = Math.max(0, (todayMs - dueDate.getTime()) / DAY_MS);
  return SUGGESTION_FOLLOW_UP_BASE + (1 - SUGGESTION_FOLLOW_UP_BASE) * Math.min(daysLate / FOLLOW_UP_LEAD_DAYS, 1);
}

/** Full weight on the day itself, half while it is still ahead. The window
 *  bound is enforced at gather time (only occurrences inside the user's lead
 *  window are collected), so anything here is in-window by construction. */
function importantDateNorm(candidate: SuggestionCandidate): number {
  if (!candidate.importantDate) return 0;
  return candidate.importantDate.daysUntil <= 0 ? 1 : 0.5;
}

/**
 * Membership earns the base; the match pass's fit ramps the remainder (19.6 →
 * 28 points). No decay and no clock: a cohort member is exactly as relevant
 * tomorrow, which is precisely why the weight sits below the terms that expire.
 * The "a few per day" ceiling is GOAL_DAILY_SLICE, applied when candidates are
 * GATHERED — never here, because a cap is cross-candidate state and this
 * function is pure per candidate.
 */
function goalNorm(candidate: SuggestionCandidate): number {
  if (!candidate.goal) return 0;
  const fit = Math.min(Math.max(candidate.goal.rank, 0), 100) / 100;
  return SUGGESTION_GOAL_BASE + (1 - SUGGESTION_GOAL_BASE) * fit;
}

function signalNorm(candidate: SuggestionCandidate, todayMs: number): number {
  if (!candidate.signal) return 0;
  return 0.5 ** (daysSince(candidate.signal.createdAt, todayMs) / SUGGESTION_SIGNAL_HALF_LIFE_DAYS);
}

/** The inverse of the strength decay: the longer the silence, the louder. */
function quietNorm(candidate: SuggestionCandidate, todayMs: number): number {
  return 1 - 0.5 ** (daysSince(candidate.lastTouch, todayMs) / STRENGTH_HALF_LIFE_DAYS);
}

export function scoreCandidate(
  candidate: SuggestionCandidate,
  todayMs: number,
  dayIndex: number,
): ScoredCandidate {
  const norms: Record<SuggestionTermId, number> = {
    cadence: cadenceNorm(candidate, todayMs),
    followUp: followUpNorm(candidate, todayMs),
    importantDate: importantDateNorm(candidate),
    goal: goalNorm(candidate),
    signal: signalNorm(candidate, todayMs),
    quiet: quietNorm(candidate, todayMs),
    degree: Math.min(candidate.degree / SUGGESTION_DEGREE_SATURATION, 1),
    starred: candidate.starred ? 1 : 0,
    rotation: hashId(`${candidate.contactId}:${dayIndex}`) / UINT32,
  };
  const terms: ScoredTerm[] = (Object.keys(norms) as SuggestionTermId[]).map((id) => ({
    id,
    points: SUGGESTION_WEIGHTS[id] * norms[id],
  }));
  const score = Math.round(terms.reduce((sum, term) => sum + term.points, 0));
  return { candidate, score, terms };
}

/** Highest score first; ties broken by the same stable hash the rest of the
 *  codebase orders by, then by id so the order is total. Scores are rounded
 *  integers before comparison (as `scoreStrength` does), so ties are exact. */
export function compareScored(a: ScoredCandidate, b: ScoredCandidate): number {
  return (
    b.score - a.score ||
    hashId(a.candidate.contactId) - hashId(b.candidate.contactId) ||
    a.candidate.contactId.localeCompare(b.candidate.contactId)
  );
}
