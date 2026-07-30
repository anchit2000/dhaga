/**
 * A CALENDAR DAY, decoupled from both the clock and the timezone database.
 *
 * WHY THIS TYPE EXISTS: "is this birthday today?" and "is this follow-up
 * overdue?" are questions about the *user's* calendar, and the user is not
 * necessarily where the server is. Answering them needs an instant plus an IANA
 * zone — which needs `Intl` with a `timeZone` option, and this package must stay
 * dependency-free and Hermes-safe for React Native (see important-dates.ts and
 * apps/web/src/lib/time/zone.ts, which explains why the zone code lives there).
 *
 * So the seam is: the CALLER resolves "which day is it for this user" and passes
 * the answer in; core does the calendar arithmetic and never asks a clock or a
 * zone. In apps/web that resolution is `zonedParts(now, prefs.timezone)`, whose
 * `ZonedParts` is structurally a `CalendarDay` — no adapter needed. Mobile does
 * no date computation today and gains no dependency from this.
 *
 * Passing a `Date` still works and still means "the day this instant falls on in
 * the RUNTIME's local zone" — the pre-existing behaviour, unchanged, so callers
 * that have no user zone to offer (and every existing call site) are untouched.
 */

/** A day on a calendar. No time, no offset — 14 March 1990 everywhere. */
export interface CalendarDay {
  /** Full year (1990, not 90). */
  year: number;
  /** 1-12, matching `ZonedParts.month` — NOT the 0-11 of `Date.getMonth()`. */
  month: number;
  /** 1-31. */
  day: number;
}

/**
 * Either an already-resolved calendar day (the zone-aware path) or an instant to
 * read the runtime-local day off (the legacy/ambient path).
 */
export type DayInput = Date | CalendarDay;

/** The calendar day `input` denotes; a `Date` resolves in the runtime's zone. */
export function toCalendarDay(input: DayInput): CalendarDay {
  if (input instanceof Date) {
    return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
  }
  return { year: input.year, month: input.month, day: input.day };
}

/**
 * Local midnight of `input`, the anchor every comparison in this module uses.
 * Local, never UTC-constructed: a UTC-midnight calendar date renders a day early
 * for every viewer west of Greenwich (see important-dates.ts header).
 */
export function startOfCalendarDay(input: DayInput): Date {
  const { year, month, day } = toCalendarDay(input);
  return new Date(year, month - 1, day);
}
