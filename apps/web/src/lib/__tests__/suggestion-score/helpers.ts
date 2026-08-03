import {
  describeSuggestion,
  scoreCandidate,
  type ScoredCandidate,
  type SuggestionCandidate,
  type SuggestionCopy,
  type SuggestionTermId,
} from "@/lib/repo/daily-suggestions";

/**
 * Fixtures for the pure scoring specs. `scoreCandidate` and `describeSuggestion`
 * take no database and no clock, so these need neither — which is what makes
 * them the specs that fail when a weight in utils/constants/suggestions.ts is
 * wrong, rather than only when the ordering it produces happens to change.
 *
 * Every comparison reuses ONE contact id, so the `rotation` modifier is a
 * constant across the pair and each assertion is about the substantive terms.
 * Rotation has its own spec (determinism.test.ts), where the id is what varies.
 */

const DAY_MS = 86_400_000;

/** A fixed local midnight and its day index — the two inputs the scorer takes
 *  in place of reading a clock. */
export const TODAY = Date.UTC(2026, 6, 15);
export const DAY_INDEX = Math.floor(TODAY / DAY_MS);

export function candidate(overrides: Partial<SuggestionCandidate> = {}): SuggestionCandidate {
  return {
    contactId: "candidate-under-test",
    name: "Priya Sharma",
    title: null,
    companyName: null,
    starred: false,
    everyDays: null,
    cadenceDue: false,
    lastTouch: new Date(TODAY),
    degree: 0,
    followUp: null,
    importantDate: null,
    goal: null,
    signal: null,
    ...overrides,
  };
}

export function daysAgo(days: number): Date {
  return new Date(TODAY - days * DAY_MS);
}

export function scored(c: SuggestionCandidate, dayIndex: number = DAY_INDEX): ScoredCandidate {
  return scoreCandidate(c, TODAY, dayIndex);
}

export function scoreOf(c: SuggestionCandidate): number {
  return scored(c).score;
}

export function copyOf(c: SuggestionCandidate): SuggestionCopy {
  return describeSuggestion(scored(c), TODAY);
}

export function pointsOf(s: ScoredCandidate, id: SuggestionTermId): number {
  return s.terms.find((term) => term.id === id)?.points ?? 0;
}
