/**
 * Calendar maths for contact "important dates" (birthdays, anniversaries).
 *
 * `ImportantDate.value` is FREE TEXT — imports and notes carry verbatim dates
 * ("December 9", "spring 2019") next to ISO ones (see schemas/contact-fields) —
 * so every reminder surface (calendar grid, follow-ups page, notification bell,
 * email) has to agree on which values are a real calendar date and where the
 * next annual occurrence falls. Pure and dependency-free (no date-fns) so the
 * web app, the mobile Hermes runtime and the email jobs share one answer.
 *
 * TIMEZONE: these are CALENDAR dates, not instants. Every Date returned here is
 * LOCAL midnight (`new Date(year, monthIndex, day)`), never UTC-constructed, and
 * every comparison normalises both sides to local midnight first — a
 * UTC-midnight birthday renders a day early for every viewer west of Greenwich.
 * Serialise with {@link formatCalendarDate}, never `toISOString()`.
 *
 * WHOSE "today"? Every function that needs one takes a {@link DayInput}: a
 * `CalendarDay` computes against the USER's day (apps/web resolves it from their
 * stored zone — ./calendar-day.ts owns that seam); a `Date` stays runtime-local.
 */

import { startOfCalendarDay, toCalendarDay, type DayInput } from "./calendar-day";

/** A stored `ImportantDate.value` that IS a calendar date. */
export interface ParsedImportantDate {
  /** 1-indexed: 1 = January. */
  month: number;
  day: number;
  /** null when the value was year-less ("03-14") — an unknown birth year. */
  year: number | null;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_DAY = /^(\d{2})-(\d{2})$/;
const THIRTY_DAY_MONTHS = [4, 6, 9, 11];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(month: number, year: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return THIRTY_DAY_MONTHS.includes(month) ? 30 : 31;
}

function isRealDate(month: number, day: number, year: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month, year);
}

/**
 * `YYYY-MM-DD` or `MM-DD` → parts; anything else → null. Verbatim prose gets no
 * reminder rather than a guessed day: an import that wrote "spring 2019" told us
 * it did not know the date, and inventing 1 March would be a wrong reminder.
 */
export function parseImportantDate(value: string): ParsedImportantDate | null {
  const trimmed = value.trim();
  const iso = ISO_DATE.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    // Leap-aware against the STORED year: 2019-02-29 never happened, so it is
    // corrupt data, not a date to build an annual reminder from.
    return isRealDate(month, day, year) ? { month, day, year } : null;
  }
  const monthDay = MONTH_DAY.exec(trimmed);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    // Year-less: validate against a LEAP year so "02-29" survives (a genuine
    // 29 Feb birthday whose year we don't know) while "02-30" still fails.
    return isRealDate(month, day, 2000) ? { month, day, year: null } : null;
  }
  return null;
}

/**
 * The occurrence in a specific year.
 *
 * FEB 29 RULE: in a non-leap year, 29 Feb falls back to 28 Feb. The reminder
 * then fires every year and stays in February — rolling to 1 March would drift
 * the anniversary into the next month, and skipping non-leap years would mean
 * no reminder 3 years in 4. The clamp is explicit because `new Date(2027, 1, 29)`
 * silently rolls over to 1 March, which is exactly the bug this rule prevents.
 */
function occurrenceInYear(parsed: ParsedImportantDate, year: number): Date {
  return new Date(year, parsed.month - 1, Math.min(parsed.day, daysInMonth(parsed.month, year)));
}

/**
 * The next annual occurrence on/after `from`. Same-day counts: today's birthday
 * is TODAY (daysUntil 0), not a year away — the whole point of the feature is
 * that the reminder is still there on the morning of the day.
 */
export function nextImportantDateOccurrence(parsed: ParsedImportantDate, from: DayInput): Date {
  const today = startOfCalendarDay(from);
  const thisYear = occurrenceInYear(parsed, today.getFullYear());
  return thisYear.getTime() >= today.getTime()
    ? thisYear
    : occurrenceInYear(parsed, today.getFullYear() + 1);
}

/**
 * Every annual occurrence inside the INCLUSIVE range — the calendar grid spans
 * a ~3-month window that can straddle a year boundary, so it needs all of them,
 * not just the next one.
 */
export function importantDateOccurrencesInRange(
  parsed: ParsedImportantDate,
  from: DayInput,
  to: DayInput,
): Date[] {
  const start = startOfCalendarDay(from);
  const end = startOfCalendarDay(to);
  const occurrences: Date[] = [];
  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    const occurrence = occurrenceInYear(parsed, year);
    if (occurrence.getTime() >= start.getTime() && occurrence.getTime() <= end.getTime()) {
      occurrences.push(occurrence);
    }
  }
  return occurrences;
}

/**
 * Whole CALENDAR days from `from` to `date` (negative in the past). Both sides
 * are normalised to local midnight first, so 23:00 today → 01:00 tomorrow is 1,
 * not 0. Rounded rather than floored because a DST boundary inside the span
 * makes a "day" 23 or 25 hours long.
 */
export function daysUntil(date: DayInput, from: DayInput): number {
  const diff = startOfCalendarDay(date).getTime() - startOfCalendarDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

/**
 * "turns 34" / "10 years" — null when the stored value carried no year, which is
 * common for imported birthdays and must render as a bare "Birthday", not "0".
 */
export function yearsTurning(parsed: ParsedImportantDate, occurrence: DayInput): number | null {
  return parsed.year == null ? null : toCalendarDay(occurrence).year - parsed.year;
}

/** `YYYY-MM-DD` from the LOCAL parts — the calendar-safe alternative to
 *  `toISOString()`, which shifts the day for viewers behind UTC (see header). */
export function formatCalendarDate(date: DayInput): string {
  const { year, month, day } = toCalendarDay(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
