/**
 * The month the calendar opens on. react-day-picker's `getInitialMonth` is
 * `month || defaultMonth || today` and IGNORES `selected`, so a picker showing a
 * 1985 birthday would open on the current month — ~500 prev-clicks from the day it
 * is displaying. Seeding from `value` fixes every call site at once; an explicit
 * `defaultMonth` still wins, for callers that want a fixed landing month.
 *
 * Kept free of React/react-day-picker imports so it stays cheap to unit-test.
 */
export function calendarStartMonth(value: Date | null, defaultMonth?: Date): Date | undefined {
  return defaultMonth ?? value ?? undefined;
}
