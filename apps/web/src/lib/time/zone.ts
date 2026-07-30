/**
 * Timezone-aware calendar maths, built on `Intl` alone — no `date-fns-tz`, no
 * new dependency (see docs/LIBRARIES.md). Every function takes an absolute
 * instant plus an IANA zone id and answers a question about the *user's* local
 * calendar ("which day is it where they are?", "is it 8am for them?"). That is
 * what reminder gating needs, and it is exactly what a stored fixed UTC offset
 * cannot answer: the same offset is a different wall clock in January and July.
 *
 * Fail-safe by design: an unknown, retired or corrupt zone id is treated as UTC
 * rather than throwing. These functions run inside crons that iterate every
 * user, and one bad stored setting must not take a whole run down. Callers that
 * need to *know* a zone is bad — form validation, settings reads — call
 * `isValidTimeZone` first and decide for themselves.
 *
 * Deliberately lives in `apps/web`, not `packages/core`: `Intl.supportedValuesOf`
 * is not dependable on React Native's Hermes runtime, and core must stay
 * dependency-free and Hermes-safe.
 */

const UTC = "UTC";

export interface ZonedParts {
  /** Full year in the target zone. */
  year: number;
  /** 1-12, not the 0-11 of `Date.getMonth()`. */
  month: number;
  /** 1-31. */
  day: number;
  /** 0-23 (h23 hour cycle, so midnight is 0 and never 24). */
  hour: number;
}

/** Whether the runtime's ICU data recognises `timeZone` as an IANA zone id. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    // RangeError: unknown/invalid zone. Any other throw here would be an ICU
    // failure we equally cannot recover from, so treat both as "not a zone".
    return false;
  }
}

/**
 * A stored/posted zone id, or `fallback` when this runtime doesn't recognise it.
 * The one place a bad zone becomes UTC *deliberately* — settings reads use it so
 * a hand-edited or since-retired id can't reach `Intl` inside a cron, and it
 * takes a `fallback` so a caller with something better to keep (the zone already
 * on record) can say so instead of resetting the user.
 */
export function coerceTimeZone(value: unknown, fallback = UTC): string {
  return typeof value === "string" && isValidTimeZone(value) ? value : fallback;
}

/**
 * Every zone id this runtime knows (~418 on Node 22+). Browser and server ICU
 * data can differ slightly, which is why the server re-validates whatever the
 * picker submits instead of trusting the client's list.
 */
export function supportedTimeZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

// Constructing a DateTimeFormat is the expensive part; the nightly jobs will
// call these per user per row. One formatter per zone, built once.
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : UTC,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  });
  // Cached under the requested id, so a bad id keeps resolving to the UTC
  // formatter without paying the try/catch again.
  formatters.set(timeZone, formatter);
  return formatter;
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((candidate) => candidate.type === type);
  return part ? Number.parseInt(part.value, 10) : Number.NaN;
}

/** The wall-clock year/month/day/hour of an instant in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date);
  return {
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
    hour: partValue(parts, "hour"),
  };
}

/**
 * `"YYYY-MM-DD"` for the calendar day the instant falls on in `timeZone`. The
 * stable key for "have we already sent today's reminder?" — two instants 30
 * minutes apart can be different days for the user and the same day in UTC.
 */
export function localDayKey(date: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Whether the instant lands on local hour `hour` (0-23) in `timeZone`. */
export function isLocalHour(date: Date, timeZone: string, hour: number): boolean {
  return zonedParts(date, timeZone).hour === hour;
}
