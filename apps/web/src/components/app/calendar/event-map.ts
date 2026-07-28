import type { EventInput } from "@fullcalendar/core";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/** The typed shape we stash on every calendar event so eventContent, eventClick
 *  and the details dialog can read a follow-up's data back off FullCalendar's
 *  (loosely-typed) extendedProps bag without reaching for `any`. */
export type FollowUpEventProps = {
  contactId: string;
  contactName: string;
  action: string;
  dueHint: string | null;
  overdue: boolean;
};

/**
 * Pure: CalendarFollowUp[] → FullCalendar EventInput[]. Only follow-ups with a
 * real due date land on the grid; date-less ones belong in the Unscheduled tray
 * (see `unscheduledFollowUps`). Overdue items get the `.fc-overdue` class so the
 * scoped theme can tint them amber; the rest render as neutral panel chips.
 */
export function toCalendarEvents(items: CalendarFollowUp[]): EventInput[] {
  return items
    .filter((item): item is CalendarFollowUp & { dueDate: string } => item.dueDate !== null)
    .map((item) => ({
      id: item.id,
      title: item.contactName,
      allDay: true,
      // Date-only portion (YYYY-MM-DD): the ISO dueDate is a UTC timestamp, and
      // feeding a UTC-midnight stamp to an allDay event shifts the day back one
      // in negative-offset timezones. The date part pins it to the right cell.
      start: item.dueDate.slice(0, 10),
      classNames: item.overdue ? ["fc-overdue"] : [],
      extendedProps: {
        contactId: item.contactId,
        contactName: item.contactName,
        action: item.action,
        dueHint: item.dueHint,
        overdue: item.overdue,
      } satisfies FollowUpEventProps,
    }));
}

/** The complement of `toCalendarEvents`: the date-less follow-ups that populate
 *  the draggable Unscheduled tray. */
export function unscheduledFollowUps(items: CalendarFollowUp[]): CalendarFollowUp[] {
  return items.filter((item) => item.dueDate === null);
}
