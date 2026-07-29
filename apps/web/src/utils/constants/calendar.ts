/** Calendar-integration constants. */

/**
 * How far around today /app/calendar reads the connected calendars. Every read
 * is an outbound Google/Microsoft call on the user's own API quota, so the
 * window is bounded rather than following the grid indefinitely: events outside
 * it simply don't appear (the page says so). Widen deliberately, not by reflex.
 */
export const EXTERNAL_EVENT_WINDOW_MONTHS = { back: 1, forward: 2 } as const;
