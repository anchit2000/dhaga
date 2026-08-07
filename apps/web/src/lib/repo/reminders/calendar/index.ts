// Split per the 150-line rule; import paths unchanged (./calendar).
import { listTasks, taskAssociationLabel } from "@/lib/repo/tasks";
import { userTimeZone } from "../local-today";
import {
  bySoonestDue,
  daysUntilDue,
  isDueSoon,
  isDueWithinEmailLeadWindow,
  isOpenFollowUp,
  isOverdue,
} from "./predicates";
import type { CalendarFollowUp } from "./types";

export { daysUntilDue, isDueSoon, isDueWithinEmailLeadWindow, isOpenFollowUp, isOverdue };
export type { CalendarFollowUp };

/**
 * One scoped read of the rows plus the user's zone, shared by all three public
 * functions below so each pays a single settings lookup. The awaits are
 * SEQUENTIAL on purpose (max-3 tenant pool — see ../local-today), and one `now`
 * is captured for the whole batch so a call straddling midnight cannot classify
 * two items against different days.
 *
 * Reads `listTasks()` — open AND done — rather than `listAllOpenFollowUps()`,
 * because the calendar shows completed work as history. The two narrow consumers
 * below filter back down with `isOpenFollowUp`, so the bell and the reminder
 * email see exactly what they saw before.
 */
async function loadFollowUps(): Promise<{ items: CalendarFollowUp[]; timeZone: string; now: Date }> {
  const timeZone = await userTimeZone();
  const rows = await listTasks();
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
      status: row.status,
      overdue: isOverdue(row, now, timeZone),
    })),
  };
}

/**
 * Every follow-up in the scoped graph — open and done — shaped for the calendar
 * view. Serialises dueDate to ISO; overdue = an OPEN follow-up with a due date
 * strictly before the start of today WHERE THE USER IS.
 */
export async function getCalendarFollowUps(): Promise<CalendarFollowUp[]> {
  return (await loadFollowUps()).items;
}

/** Nav bell: overdue + due-today counts, plus a capped preview list. */
export async function getNotificationSummary(): Promise<{
  dueToday: number;
  overdue: number;
  items: CalendarFollowUp[];
}> {
  const { items, timeZone, now } = await loadFollowUps();
  // OPEN only: the bell means "still to do". Done rows reach the calendar, never
  // this badge.
  const all = items.filter(isOpenFollowUp);
  return {
    dueToday: all.filter((f) => daysUntilDue(f.dueDate, now, timeZone) === 0).length,
    overdue: all.filter((f) => f.overdue).length,
    // Arrow, not a bare `isDueSoon`: filter would pass the index as `now`.
    items: all.filter((f) => isDueSoon(f, now, timeZone)).sort(bySoonestDue).slice(0, 8),
  };
}

/**
 * Email job (runs inside a per-tenant withUserDb): every OPEN overdue, due-today
 * and due-within-FOLLOW_UP_LEAD_DAYS item, uncapped. One `now` for the whole
 * filter so a run that straddles midnight can't classify two items against
 * different days.
 */
export async function getDueFollowUpRemindersForUser(): Promise<CalendarFollowUp[]> {
  const { items, timeZone, now } = await loadFollowUps();
  return items
    .filter((f) => isOpenFollowUp(f) && isDueWithinEmailLeadWindow(f, now, timeZone))
    .sort(bySoonestDue);
}
