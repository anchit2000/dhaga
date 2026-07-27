import { isBefore, isToday, startOfDay } from "date-fns";
import { listAllOpenFollowUps } from "./follow-ups";

export type CalendarFollowUp = {
  id: string;
  contactId: string;
  contactName: string;
  action: string;
  dueDate: string | null; // ISO
  dueHint: string | null;
  overdue: boolean;
};

/**
 * Every open follow-up in the scoped graph, shaped for the calendar view.
 * Reuses listAllOpenFollowUps (same scoped read) and serialises dueDate to ISO;
 * overdue = the follow-up has a due date strictly before the start of today.
 */
export async function getCalendarFollowUps(): Promise<CalendarFollowUp[]> {
  const rows = await listAllOpenFollowUps();
  const today = startOfDay(new Date());
  return rows.map((row) => ({
    id: row.id,
    contactId: row.contactId,
    contactName: row.contactName,
    action: row.action,
    dueHint: row.dueHint,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    overdue: row.dueDate != null && isBefore(row.dueDate, today),
  }));
}

/** Overdue or due today — the set the bell and the reminder email care about. */
function isDueSoon(f: CalendarFollowUp): boolean {
  return f.overdue || (f.dueDate != null && isToday(new Date(f.dueDate)));
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
  const all = await getCalendarFollowUps();
  return {
    dueToday: all.filter((f) => f.dueDate != null && isToday(new Date(f.dueDate)))
      .length,
    overdue: all.filter((f) => f.overdue).length,
    items: all.filter(isDueSoon).sort(bySoonestDue).slice(0, 8),
  };
}

/** Email job (runs inside a per-tenant withUserDb): every due/overdue item, uncapped. */
export async function getDueFollowUpRemindersForUser(): Promise<CalendarFollowUp[]> {
  const all = await getCalendarFollowUps();
  return all.filter(isDueSoon).sort(bySoonestDue);
}
