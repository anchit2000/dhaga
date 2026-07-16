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

const WEEKDAY_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "16 Jul 2026" — use instead of `date.toLocaleDateString()` in client components. */
export function formatDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

/** "Thu 14:30" — use instead of `date.toLocaleString()`/`toLocaleTimeString()`
 *  in client components that need a weekday + time (e.g. meeting-slot pickers). */
export function formatWeekdayTime(date: Date): string {
  return WEEKDAY_TIME_FORMAT.format(date);
}
