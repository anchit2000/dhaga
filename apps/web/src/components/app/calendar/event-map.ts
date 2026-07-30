import type { EventInput } from "@fullcalendar/core";
import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";

/** Untitled connected-calendar events are real (a private or unnamed block) —
 *  label them honestly rather than rendering an empty chip. */
const UNTITLED_EXTERNAL_EVENT = "Busy";

/** Sort key feeding FullCalendar's `eventOrder` (see CalendarBoard). Follow-ups
 *  are Dhaga's own work and must never be the ones hidden behind "+N more" on a
 *  day the connected calendar has filled; connected events sort after them. */
const FOLLOW_UP_RANK = 0;
const EXTERNAL_RANK = 1;

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

/** The same trick for events read from a CONNECTED calendar. `external` is the
 *  discriminator — the one key a follow-up's props never carry — so the board
 *  can tell the two kinds apart (see `isExternalEventProps`). */
export type ExternalEventProps = {
  external: true;
  provider: string;
  accountEmail: string | null;
  location: string | null;
};

/** Everything the grid can hold: a Dhaga follow-up or a connected-calendar event. */
export type CalendarEventProps = FollowUpEventProps | ExternalEventProps;

/** Narrows the extendedProps union. Connected-calendar events are read-only, so
 *  every handler that mutates a follow-up bails out through this guard. */
export function isExternalEventProps(props: CalendarEventProps): props is ExternalEventProps {
  return "external" in props;
}

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
      rank: FOLLOW_UP_RANK,
      extendedProps: {
        contactId: item.contactId,
        contactName: item.contactName,
        action: item.action,
        dueHint: item.dueHint,
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
      external: true,
      provider: event.provider,
      accountEmail: event.accountEmail,
      location: event.location,
    } satisfies ExternalEventProps,
  }));
}

/** The complement of `toCalendarEvents`: the date-less follow-ups that populate
 *  the draggable Unscheduled tray. */
export function unscheduledFollowUps(items: CalendarFollowUp[]): CalendarFollowUp[] {
  return items.filter((item) => item.dueDate === null);
}
