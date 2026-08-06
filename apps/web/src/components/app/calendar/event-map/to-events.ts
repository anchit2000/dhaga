import type { EventInput } from "@fullcalendar/core";
import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";
import type { ExternalEventProps, FollowUpEventProps, ImportantDateEventProps } from "./props";

/** Untitled connected-calendar events are real (a private or unnamed block) —
 *  label them honestly rather than rendering an empty chip. */
const UNTITLED_EXTERNAL_EVENT = "Busy";

/** Sort key feeding FullCalendar's `eventOrder` (see CalendarBoard). Follow-ups
 *  are Dhaga's own work and must never be the ones hidden behind "+N more" on a
 *  day the connected calendar has filled; important dates are Dhaga's own data
 *  too, so they outrank third-party context but never a task. */
const FOLLOW_UP_RANK = 0;
const IMPORTANT_DATE_RANK = 1;
const EXTERNAL_RANK = 2;

/**
 * Pure: CalendarFollowUp[] → FullCalendar EventInput[]. Only follow-ups with a
 * real due date land on the grid; date-less ones belong in the Unscheduled tray
 * (see `unscheduledFollowUps`). Overdue items get the `.fc-overdue` class so the
 * scoped theme can tint them amber; the rest render as neutral panel chips.
 *
 * COMPLETED rows ride along as history (`.fc-done`, struck through) — the
 * calendar used to hide them, which read as if the work had never happened. They
 * are read-only by construction: `editable`/`startEditable` are false per event,
 * so no drag can start and `handleEventDrop` can never re-date finished work.
 * `.fc-done` also replaces `.fc-overdue` rather than joining it — a done row is
 * never late (see repo/reminders/calendar/predicates.ts `isOverdue`).
 */
export function toCalendarEvents(items: CalendarFollowUp[]): EventInput[] {
  return items
    .filter((item): item is CalendarFollowUp & { dueDate: string } => item.dueDate !== null)
    .map((item) => ({
      id: item.id,
      title: item.associationLabel,
      allDay: true,
      // Date-only portion (YYYY-MM-DD): the ISO dueDate is a UTC timestamp, and
      // feeding a UTC-midnight stamp to an allDay event shifts the day back one
      // in negative-offset timezones. The date part pins it to the right cell.
      start: item.dueDate.slice(0, 10),
      classNames: item.status === "done" ? ["fc-done"] : item.overdue ? ["fc-overdue"] : [],
      editable: item.status === "open",
      startEditable: item.status === "open",
      rank: FOLLOW_UP_RANK,
      extendedProps: {
        kind: "follow-up",
        contactId: item.contactId,
        contactName: item.contactName,
        companyId: item.companyId,
        companyName: item.companyName,
        associationLabel: item.associationLabel,
        action: item.action,
        dueDate: item.dueDate,
        dueHint: item.dueHint,
        status: item.status,
        overdue: item.overdue,
      } satisfies FollowUpEventProps,
    }));
}

/**
 * Pure: ExternalCalendarEvent[] → FullCalendar EventInput[]. These come from a
 * connected calendar, not from Dhaga, so they are read-only here: `editable`
 * and `startEditable` are false per event (no drag can even start) and the
 * `.fc-external` class gives the scoped theme its quieter, non-amber treatment.
 * `display: "block"` keeps timed events chips too, so the whole class reads as
 * one thing rather than splitting into chips and dots by all-day-ness.
 */
export function toExternalCalendarEvents(events: ExternalCalendarEvent[]): EventInput[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title ?? UNTITLED_EXTERNAL_EVENT,
    allDay: event.allDay,
    // All-day endpoints are UTC-midnight instants (packages/core pins a bare
    // YYYY-MM-DD there) and an allDay end is exclusive on both sides, so the
    // date part maps straight across — and, as with follow-ups above, avoids
    // the UTC stamp shifting the day back in negative-offset timezones. Timed
    // events keep the full instant and render in the viewer's local time.
    start: event.allDay ? event.start.slice(0, 10) : event.start,
    end: event.allDay ? event.end.slice(0, 10) : event.end,
    display: "block",
    editable: false,
    startEditable: false,
    classNames: ["fc-external"],
    rank: EXTERNAL_RANK,
    extendedProps: {
      kind: "external",
      provider: event.provider,
      accountEmail: event.accountEmail,
      location: event.location,
    } satisfies ExternalEventProps,
  }));
}

/**
 * Stable id for a derived occurrence. The `important-date:` prefix means it can
 * never be mistaken for the uuid of a follow-up by a handler that lost its
 * guard, and the (contact, date, label) key is exactly the occurrence's identity:
 * one contact can carry several important dates, and a window straddling a year
 * boundary can hold the same one twice.
 */
function importantDateEventId(item: UpcomingImportantDate): string {
  return `important-date:${item.contactId}:${item.date}:${item.label}`;
}

/**
 * Pure: UpcomingImportantDate[] → FullCalendar EventInput[]. Birthdays and
 * anniversaries are DERIVED from the contact, so they are read-only on the grid
 * the same way connected-calendar events are: `editable`/`startEditable` false
 * per event, so no drag can start and `handleEventDrop` can never fire with a
 * contact id where a follow-up id belongs.
 */
export function toImportantDateEvents(items: UpcomingImportantDate[]): EventInput[] {
  return items.map((item) => ({
    id: importantDateEventId(item),
    title: `${item.contactName} — ${item.label}`,
    allDay: true,
    // Already a LOCAL calendar date (YYYY-MM-DD) from listImportantDateOccurrences
    // — passed through untouched on purpose. Any Date/ISO round-trip here lands a
    // birthday a day early in a negative-offset timezone.
    start: item.date,
    display: "block",
    editable: false,
    startEditable: false,
    classNames: ["fc-important-date"],
    rank: IMPORTANT_DATE_RANK,
    extendedProps: {
      kind: "important-date",
      contactId: item.contactId,
      contactName: item.contactName,
      label: item.label,
      turning: item.turning,
    } satisfies ImportantDateEventProps,
  }));
}

/** The complement of `toCalendarEvents`: the date-less follow-ups that populate
 *  the draggable Unscheduled tray. Important dates can never appear here — the
 *  tray is typed to follow-ups, and every occurrence is dated by construction. */
export function unscheduledFollowUps(items: CalendarFollowUp[]): CalendarFollowUp[] {
  return items.filter((item) => item.dueDate === null);
}
