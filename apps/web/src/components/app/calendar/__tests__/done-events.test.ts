import { describe, expect, it } from "vitest";
import { toCalendarEvents } from "../event-map";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * Completed follow-ups now ride the grid as history. Two things must hold, and
 * neither is cosmetic:
 *
 *  1. A done row is READ-ONLY. If a drag could start on one, `handleEventDrop`
 *     would re-date finished work — and the calendar write-out would move the
 *     event on the user's connected Google/Outlook calendar with it.
 *  2. A done row is never OVERDUE. `.fc-overdue` is the amber fill that means
 *     "you are late"; putting it on work already done accuses the user of
 *     missing something they did.
 */
function followUp(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "fu-1",
    contactId: "c-1",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: "2026-07-03T00:00:00.000Z",
    dueHint: null,
    status: "open",
    overdue: false,
    ...over,
  };
}

describe("done follow-ups on the grid", () => {
  it("appear at all — the calendar used to drop them", () => {
    const [event] = toCalendarEvents([followUp({ status: "done" })]);
    expect(event.id).toBe("fu-1");
    expect(event.start).toBe("2026-07-03");
  });

  it("cannot be dragged, so finished work is never re-dated", () => {
    const [event] = toCalendarEvents([followUp({ status: "done" })]);
    expect(event.editable).toBe(false);
    expect(event.startEditable).toBe(false);
  });

  it("carry .fc-done and never .fc-overdue, even on a stale overdue flag", () => {
    // Defence in depth: the repo layer already refuses to mark a done row
    // overdue, so this is the second gate on the same product statement.
    const [event] = toCalendarEvents([followUp({ status: "done", overdue: true })]);
    expect(event.classNames).toEqual(["fc-done"]);
  });

  it("leave open rows draggable and still amber when late", () => {
    const [event] = toCalendarEvents([followUp({ overdue: true })]);
    expect(event.classNames).toEqual(["fc-overdue"]);
    expect(event.editable).toBe(true);
  });

  it("expose status on extendedProps so the details dialog can go read-only", () => {
    const [event] = toCalendarEvents([followUp({ status: "done" })]);
    expect(event.extendedProps).toMatchObject({ kind: "follow-up", status: "done" });
  });
});
