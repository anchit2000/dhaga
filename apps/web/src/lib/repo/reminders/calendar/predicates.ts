import { daysUntil } from "@dhaga/core";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import { localDay } from "../local-today";
import type { CalendarFollowUp } from "./types";

/**
 * WHICH DAY IS "TODAY"? The user's, from their stored IANA zone (../local-today) —
 * not the server's. Same instant, different calendar day: a follow-up due
 * 2026-07-30 read "overdue" from 17:00 on the 29th for a user in UTC-7, and only
 * flipped to overdue at 05:30 on the 31st for one in UTC+5:30.
 *
 * The pure predicates below default to the HOST zone instead, because that is
 * what the date-fns `isToday`/`isBefore`/`differenceInCalendarDays` they replaced
 * read. Hosted, the host zone IS UTC — also the default SchedulePrefs.timezone —
 * so an unset zone, and any caller with no zone to hand, keeps the old result.
 */
function hostTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Whole calendar days from `now` to a due date, in `timeZone`; null when undated.
 * THE day boundary — everything here derives from it (overdue is `< 0`, due today
 * is `=== 0`), so it is exported for tests to pin where that boundary falls.
 */
export function daysUntilDue(dueDate: string | Date | null, now: Date, tz: string): number | null {
  if (dueDate == null) return null;
  return daysUntil(localDay(new Date(dueDate), tz), localDay(now, tz));
}

/**
 * Is this row LATE? Two ways it cannot be, and both are product statements
 * rather than arithmetic:
 *  - a COMPLETED follow-up is finished work. Now that done rows render on the
 *    calendar, an amber "overdue" chip on one would accuse the user of being
 *    late for something they already did.
 *  - an UNDATED follow-up has no day to be past (`?? 0`), so it waits in the
 *    Unscheduled tray instead of nagging.
 */
export function isOverdue(
  row: { status: "open" | "done"; dueDate: string | Date | null },
  now: Date,
  tz: string,
): boolean {
  if (row.status !== "open") return false;
  return (daysUntilDue(row.dueDate, now, tz) ?? 0) < 0;
}

/**
 * The OUTSTANDING set. The calendar deliberately shows done rows too, so every
 * surface that means "still to do" — bell badge, reminder email — narrows with
 * this first. Widening what the calendar loads must never widen those.
 */
export function isOpenFollowUp(f: CalendarFollowUp): boolean {
  return f.status === "open";
}

/**
 * Overdue or due today — the set the NAV BELL counts and previews. Its badge
 * means "needs attention now", so this must stay narrow: widening it would
 * silently inflate the bell (see getNotificationSummary). The email's lead
 * window is a separate predicate for exactly that reason. Exported so a test can
 * pin the distinction between the two.
 *
 * `timeZone` moves the day boundary; both params default as hostTimeZone says.
 */
export function isDueSoon(
  f: CalendarFollowUp,
  now: Date = new Date(),
  timeZone: string = hostTimeZone(),
): boolean {
  return f.overdue || daysUntilDue(f.dueDate, now, timeZone) === 0;
}

/**
 * The EMAIL set: overdue, due today, or due within FOLLOW_UP_LEAD_DAYS. A daily
 * email that only listed today's work arrived too late to act on — before this
 * window a follow-up due in three days was never emailed at all, it simply
 * appeared as "overdue" once the chance to do it had passed.
 */
export function isDueWithinEmailLeadWindow(
  f: CalendarFollowUp,
  now: Date = new Date(),
  timeZone: string = hostTimeZone(),
): boolean {
  if (isDueSoon(f, now, timeZone)) return true;
  const days = daysUntilDue(f.dueDate, now, timeZone);
  return days != null && days > 0 && days <= FOLLOW_UP_LEAD_DAYS;
}

/** Ascending due date: overdue (earlier) first, then soonest. */
export function bySoonestDue(a: CalendarFollowUp, b: CalendarFollowUp): number {
  return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
}
