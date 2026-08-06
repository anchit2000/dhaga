import { daysUntil } from "@dhaga/core";
import type { RecurrenceRule } from "@dhaga/core";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import { listAllOpenFollowUps } from "./follow-ups";
import { taskAssociationLabel } from "@/lib/repo/tasks";
import { localDay, userTimeZone } from "./local-today";

export type CalendarFollowUp = {
  /**
   * Discriminator for the notification bell and the calendar grid, which now
   * carry more than one kind of reminder. Only follow-ups can be marked done, so
   * the bell's inline Done button must branch on this rather than assume.
   *
   * EXTENSION POINT: a second kind (e.g. an important-date item derived from
   * ./important-dates.ts) becomes its own type with `kind: "important-date"`,
   * unioned into getNotificationSummary's `items` below — no change to this type.
   */
  kind: "follow-up";
  id: string;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  associationLabel: string;
  recurrence: RecurrenceRule | null;
  action: string;
  dueDate: string | null; // ISO
  dueHint: string | null;
  overdue: boolean;
};

/**
 * WHICH DAY IS "TODAY"? The user's, from their stored IANA zone (./local-today) —
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
 * One scoped read of the rows plus the user's zone, shared by all three public
 * functions below so each pays a single settings lookup. The awaits are
 * SEQUENTIAL on purpose (max-3 tenant pool — see ./local-today), and one `now` is
 * captured for the whole batch so a call straddling midnight cannot classify two
 * items against different days.
 */
async function loadFollowUps(): Promise<{ items: CalendarFollowUp[]; timeZone: string; now: Date }> {
  const timeZone = await userTimeZone();
  const rows = await listAllOpenFollowUps();
  const now = new Date();
  return {
    timeZone,
    now,
    items: rows.map((row) => ({
      kind: "follow-up" as const,
      id: row.id,
      contactId: row.contactId,
      contactName: row.contactName,
      companyId: row.companyId,
      companyName: row.companyName,
      associationLabel: taskAssociationLabel(row),
      recurrence: row.recurrence,
      action: row.action,
      dueHint: row.dueHint,
      dueDate: row.dueDate ? row.dueDate.toISOString() : null,
      // `?? 0`: an undated follow-up has no day to be past, so it is never overdue.
      overdue: (daysUntilDue(row.dueDate, now, timeZone) ?? 0) < 0,
    })),
  };
}

/**
 * Every open follow-up in the scoped graph, shaped for the calendar view.
 * Reuses listAllOpenFollowUps (same scoped read) and serialises dueDate to ISO;
 * overdue = the follow-up has a due date strictly before the start of today
 * WHERE THE USER IS.
 */
export async function getCalendarFollowUps(): Promise<CalendarFollowUp[]> {
  return (await loadFollowUps()).items;
}

/**
 * Overdue or due today — the set the NAV BELL counts and previews. Its badge
 * means "needs attention now", so this must stay narrow: widening it would
 * silently inflate the bell (see getNotificationSummary below). The email's
 * lead window is a separate predicate for exactly that reason. Exported so a
 * test can pin the distinction between the two.
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
function bySoonestDue(a: CalendarFollowUp, b: CalendarFollowUp): number {
  return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
}

/** Nav bell: overdue + due-today counts, plus a capped preview list. */
export async function getNotificationSummary(): Promise<{
  dueToday: number;
  overdue: number;
  items: CalendarFollowUp[];
}> {
  const { items: all, timeZone, now } = await loadFollowUps();
  return {
    dueToday: all.filter((f) => daysUntilDue(f.dueDate, now, timeZone) === 0).length,
    overdue: all.filter((f) => f.overdue).length,
    // Arrow, not a bare `isDueSoon`: filter would pass the index as `now`.
    items: all.filter((f) => isDueSoon(f, now, timeZone)).sort(bySoonestDue).slice(0, 8),
  };
}

/**
 * Email job (runs inside a per-tenant withUserDb): every overdue, due-today and
 * due-within-FOLLOW_UP_LEAD_DAYS item, uncapped. One `now` for the whole filter
 * so a run that straddles midnight can't classify two items against different days.
 */
export async function getDueFollowUpRemindersForUser(): Promise<CalendarFollowUp[]> {
  const { items: all, timeZone, now } = await loadFollowUps();
  return all.filter((f) => isDueWithinEmailLeadWindow(f, now, timeZone)).sort(bySoonestDue);
}
