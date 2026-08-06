/**
 * Deterministic date/time formatting for client components.
 * `toLocaleDateString`/`toLocaleString` follow the runtime's locale — the
 * Next.js server renders with the server's locale while the browser
 * hydrates with the user's, so any "use client" component calling them
 * during render produces a React #418 hydration mismatch whenever the two
 * locales differ. Pin the locale so server and client always agree.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const FULL_DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const WEEKDAY_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "16 Jul 2026" — use instead of `date.toLocaleDateString()` in client components. */
export function formatDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

/** Semantic due dates are stored at UTC midnight and must display that UTC day. */
export function formatDueDate(date: Date): string {
  return DUE_DATE_FORMAT.format(date);
}

export function formatFullDueDate(date: Date): string {
  return FULL_DUE_DATE_FORMAT.format(date);
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "16 Jul 2026, 14:30" — use instead of `date.toLocaleString()` in client
 *  components that show a date + time (e.g. a note's timestamp). */
export function formatDateTime(date: Date): string {
  return DATE_TIME_FORMAT.format(date);
}

/** "Thu 14:30" — use instead of `date.toLocaleString()`/`toLocaleTimeString()`
 *  in client components that need a weekday + time (e.g. meeting-slot pickers). */
export function formatWeekdayTime(date: Date): string {
  return WEEKDAY_TIME_FORMAT.format(date);
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

/**
 * "2 hours ago", "yesterday", "3 days ago" — and the absolute date once the gap
 * passes a month, where "37 days ago" stops being easier to read than "16 Jul
 * 2026". `now` is a parameter so callers (and tests) fix the clock rather than
 * the function reading an ambient one mid-render.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const elapsed = Math.abs(seconds);
  if (elapsed < 45) return "just now";
  if (elapsed < 3600) return RELATIVE_FORMAT.format(Math.round(seconds / 60), "minute");
  if (elapsed < 86_400) return RELATIVE_FORMAT.format(Math.round(seconds / 3600), "hour");
  if (elapsed < 86_400 * 30) return RELATIVE_FORMAT.format(Math.round(seconds / 86_400), "day");
  return formatDate(date);
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

const DAY_MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

/** "Thursday · 17 Jul" — Home's daily-briefing eyebrow. */
export function formatDayline(date: Date): string {
  return `${WEEKDAY_FORMAT.format(date)} · ${DAY_MONTH_FORMAT.format(date)}`;
}
