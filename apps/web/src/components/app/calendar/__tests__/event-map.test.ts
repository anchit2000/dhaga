import { describe, expect, it } from "vitest";
import type { CalendarFollowUp, UpcomingImportantDate } from "@/lib/repo/reminders";
import type { ExternalCalendarEvent } from "@/lib/repo/calendar";
import {
  importantDateNote,
  isExternalEventProps,
  isFollowUpEventProps,
  isImportantDateEventProps,
  toCalendarEvents,
  toExternalCalendarEvents,
  toImportantDateEvents,
  unscheduledFollowUps,
  type CalendarEventProps,
} from "../event-map";

/**
 * The calendar grid now mixes three kinds of entry, and only ONE of them (a
 * follow-up) has a row Dhaga may write to. These tests exist because both ways
 * that can go wrong are silent:
 *
 *  1. A birthday is a bare local calendar date. Round-tripping it through Date/
 *     ISO lands it a day early for every user west of UTC — and "Dhaga wished
 *     her happy birthday a day early" is exactly the failure the feature exists
 *     to prevent. So the exact `start` string is asserted, not a Date.
 *  2. An important date's event id is built from a CONTACT id. If it ever reaches
 *     rescheduleFollowUpAction it is not a no-op — it is a write against the
 *     wrong table's key. So "not editable" and "the guards discriminate" are
 *     asserted as behaviour, not left to code review.
 */

function followUp(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "fu-1",
    contactId: "contact-1",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: "2026-08-03T00:00:00.000Z",
    dueHint: "next week",
    status: "open",
    overdue: false,
    ...over,
  };
}

function importantDate(over: Partial<UpcomingImportantDate> = {}): UpcomingImportantDate {
  return {
    contactId: "contact-9",
    contactName: "Priya",
    label: "Birthday",
    value: "1992-03-14",
    date: "2026-03-14",
    daysUntil: 12,
    turning: 34,
    ...over,
  };
}

function externalEvent(over: Partial<ExternalCalendarEvent> = {}): ExternalCalendarEvent {
  return {
    id: "conn-1:evt-1",
    connectionId: "conn-1",
    provider: "google",
    accountEmail: "me@example.com",
    title: "Standup",
    start: "2026-03-14T09:00:00.000Z",
    end: "2026-03-14T09:15:00.000Z",
    allDay: false,
    location: "Zoom",
    ...over,
  };
}

/** extendedProps as the board actually reads it back off a FullCalendar event. */
function propsOf(event: { extendedProps?: unknown }): CalendarEventProps {
  return event.extendedProps as CalendarEventProps;
}

describe("toImportantDateEvents", () => {
  it("keeps the local calendar date byte-for-byte — a UTC round-trip would move the birthday", () => {
    const [event] = toImportantDateEvents([importantDate({ date: "2026-03-14" })]);
    // The literal string, not a Date: listImportantDateOccurrences already
    // resolved the LOCAL day, and any reinterpretation shifts it.
    expect(event.start).toBe("2026-03-14");
    expect(event.allDay).toBe(true);
    expect(event.end).toBeUndefined();
  });

  it("titles the chip so it reads as a person and an occasion", () => {
    const [event] = toImportantDateEvents([
      importantDate({ contactName: "Priya", label: "Birthday" }),
    ]);
    expect(event.title).toBe("Priya — Birthday");
  });

  it("is not draggable, so no drag can start on a record that does not exist", () => {
    const [event] = toImportantDateEvents([importantDate()]);
    expect(event.editable).toBe(false);
    expect(event.startEditable).toBe(false);
  });

  it("namespaces the id so a contact id can never be read back as a follow-up id", () => {
    const item = importantDate({ contactId: "contact-9" });
    const [event] = toImportantDateEvents([item]);
    expect(event.id).not.toBe(item.contactId);
    expect(String(event.id).startsWith("important-date:")).toBe(true);
  });

  it("gives each occurrence of the same contact its own id, so a window holding two does not collapse", () => {
    const events = toImportantDateEvents([
      importantDate({ date: "2025-12-31", label: "Anniversary" }),
      importantDate({ date: "2026-03-14", label: "Birthday" }),
    ]);
    expect(new Set(events.map((e) => e.id)).size).toBe(2);
  });

  it("sorts between follow-ups and connected events, so a busy day hides neither of Dhaga's own", () => {
    const [ours] = toCalendarEvents([followUp()]);
    const [date] = toImportantDateEvents([importantDate()]);
    const [theirs] = toExternalCalendarEvents([externalEvent()]);
    expect(Number(ours.rank)).toBeLessThan(Number(date.rank));
    expect(Number(date.rank)).toBeLessThan(Number(theirs.rank));
  });
});

describe("importantDateNote", () => {
  /** The props the chip renderer holds, via the mapper — never hand-built. */
  function noteFor(over: Partial<UpcomingImportantDate>): string | null {
    const props = propsOf(toImportantDateEvents([importantDate(over)])[0]);
    if (!isImportantDateEventProps(props)) throw new Error("expected an important date");
    return importantDateNote(props);
  }

  it("says the age for a birthday", () => {
    expect(noteFor({ label: "Birthday", turning: 34 })).toBe("Turns 34");
  });

  it("counts years for anything else, because 'turns' only makes sense for a person", () => {
    expect(noteFor({ label: "Work anniversary", turning: 10 })).toBe("10 years");
  });

  it("says nothing when the stored value carried no year — an invented age is worse than silence", () => {
    expect(noteFor({ label: "Birthday", turning: null })).toBeNull();
  });
});

describe("the extendedProps guards", () => {
  const props = {
    followUp: propsOf(toCalendarEvents([followUp()])[0]),
    importantDate: propsOf(toImportantDateEvents([importantDate()])[0]),
    external: propsOf(toExternalCalendarEvents([externalEvent()])[0]),
  };

  it("narrows each of the three kinds to exactly itself", () => {
    expect([
      isFollowUpEventProps(props.followUp),
      isImportantDateEventProps(props.followUp),
      isExternalEventProps(props.followUp),
    ]).toEqual([true, false, false]);
    expect([
      isFollowUpEventProps(props.importantDate),
      isImportantDateEventProps(props.importantDate),
      isExternalEventProps(props.importantDate),
    ]).toEqual([false, true, false]);
    expect([
      isFollowUpEventProps(props.external),
      isImportantDateEventProps(props.external),
      isExternalEventProps(props.external),
    ]).toEqual([false, false, true]);
  });

  it("refuses an important date the follow-up gate that every write sits behind", () => {
    // useReschedule / handleEventClick gate POSITIVELY on this: false here is
    // what keeps a contact id out of rescheduleFollowUpAction.
    expect(isFollowUpEventProps(props.importantDate)).toBe(false);
  });
});

describe("unscheduledFollowUps", () => {
  it("trays a follow-up with no due date — it still needs one", () => {
    const dateless = followUp({ id: "fu-2", dueDate: null });
    expect(unscheduledFollowUps([followUp(), dateless])).toEqual([dateless]);
  });

  it("cannot ever tray an important date: every occurrence is dated by construction", () => {
    // The tray is typed to CalendarFollowUp, so this is the runtime half of that
    // guarantee — an occurrence always maps onto the grid, never into the tray.
    const events = toImportantDateEvents([importantDate(), importantDate({ date: "2026-04-01" })]);
    expect(events.every((event) => typeof event.start === "string" && event.start !== "")).toBe(true);
    expect(unscheduledFollowUps([])).toEqual([]);
  });
});
