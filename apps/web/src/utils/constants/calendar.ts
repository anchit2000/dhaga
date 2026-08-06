/** Calendar-integration constants. */

/**
 * How far around today /app/calendar reads the connected calendars. Every read
 * is an outbound Google/Microsoft call on the user's own API quota, so the
 * window is bounded rather than following the grid indefinitely: events outside
 * it simply don't appear (the page says so). Widen deliberately, not by reflex.
 */
export const EXTERNAL_EVENT_WINDOW_MONTHS = { back: 1, forward: 2 } as const;

/** Settings key holding the user's last free/busy snapshot (see
 *  lib/repo/calendar/free-busy-snapshot.ts — Home renders from it instead of
 *  calling Google while it holds a tenant connection). */
export const FREE_BUSY_SNAPSHOT_KEY = "calendar_free_busy_snapshot";

/**
 * Older than this and the snapshot is REFRESHED after the response — the render
 * still uses it, so the page never waits on the provider.
 */
export const FREE_BUSY_SNAPSHOT_STALE_MS = 5 * 60_000;

/**
 * Older than this and it is not used at all. It bounds how wrong the derived
 * calendar UI may be, and the direction of the error is what makes the bound
 * necessary: a snapshot too old to still cover today would read as "no busy
 * blocks", i.e. as free time the user does not have. Beyond this age Home
 * renders the calendar tiles as unknown rather than as free.
 */
export const FREE_BUSY_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60_000;

/**
 * How far the pointer may travel between pressing an Unscheduled chip and
 * releasing it while the press still counts as a CLICK rather than a drag.
 * The chips are FullCalendar drag sources AND buttons that open the details
 * dialog, so without a slop threshold every abandoned drag — and every drag that
 * ends off the grid — would pop the dialog open on release.
 */
export const TRAY_CHIP_CLICK_SLOP_PX = 5;

/**
 * Status axis of the calendar filter bar. Completed follow-ups now render on the
 * grid struck through, which is the point — but a calendar of finished work is
 * noise when you are planning, so hiding them has to be one control away.
 */
export const CALENDAR_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
] as const;

export type CalendarStatusFilter = (typeof CALENDAR_STATUS_FILTERS)[number]["value"];
