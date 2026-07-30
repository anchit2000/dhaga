import { describe, expect, it } from "vitest";

import { linksAfterWrites, planCalendarWrites, toDeviceDates } from "../plan";

import type { FollowUpSummary } from "../types";

function followUp(overrides: Partial<FollowUpSummary> = {}): FollowUpSummary {
  return {
    id: "fu-1",
    contactId: "c-1",
    contactName: "Ada Lovelace",
    action: "Send the analytical engine notes",
    dueDate: "2026-08-04T00:00:00.000Z",
    dueHint: null,
    status: "open",
    ...overrides,
  };
}

describe("planCalendarWrites", () => {
  it("creates an event for an open, dated follow-up we have never written", () => {
    const plan = planCalendarWrites([followUp()], {});
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].event.title).toBe("Follow up: Ada Lovelace");
    // The action rides in the description so the event tells the user what to
    // do without them opening Dhaga.
    expect(plan.creates[0].event.description).toBe("Send the analytical engine notes");
  });

  it("UPDATES rather than re-creates when we already hold a link", () => {
    // Without this the calendar gains a second copy of every follow-up on every
    // run — the single failure mode the link store exists to prevent.
    const plan = planCalendarWrites([followUp()], { "fu-1": "evt-1" });
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates).toEqual([
      { followUpId: "fu-1", eventId: "evt-1", event: expect.anything() },
    ]);
  });

  it("REMOVES the event when a follow-up is completed", () => {
    // "Completing a follow-up should take it off the calendar" is the promise;
    // a done item that stays booked is a reminder to do work already done.
    const plan = planCalendarWrites([followUp({ status: "done" })], { "fu-1": "evt-1" });
    expect(plan.deletes).toEqual([{ followUpId: "fu-1", eventId: "evt-1" }]);
  });

  it("REMOVES the event when a follow-up is dismissed", () => {
    const plan = planCalendarWrites([followUp({ status: "dismissed" })], { "fu-1": "evt-1" });
    expect(plan.deletes).toEqual([{ followUpId: "fu-1", eventId: "evt-1" }]);
  });

  it("REMOVES the event when the due date is cleared, since it no longer belongs on a day", () => {
    const plan = planCalendarWrites([followUp({ dueDate: null })], { "fu-1": "evt-1" });
    expect(plan.deletes).toEqual([{ followUpId: "fu-1", eventId: "evt-1" }]);
  });

  it("REMOVES the event of a follow-up that vanished from the server entirely", () => {
    // A deleted follow-up is never mentioned again, so this is the only chance
    // to clean it up. Miss it and the event haunts the user's calendar forever
    // with nothing left to explain where it came from.
    const plan = planCalendarWrites([], { "fu-gone": "evt-9" });
    expect(plan.deletes).toEqual([{ followUpId: "fu-gone", eventId: "evt-9" }]);
  });

  it("does nothing for a closed follow-up we never wrote — no phantom deletes", () => {
    const plan = planCalendarWrites([followUp({ status: "done" })], {});
    expect(plan).toEqual({ creates: [], updates: [], deletes: [] });
  });

  it("drops a follow-up whose due date is unparseable instead of booking an Invalid Date", () => {
    // An Invalid Date reaches the OS as a broken event; treating it as undated
    // keeps the rest of the run intact.
    const plan = planCalendarWrites([followUp({ dueDate: "not-a-date" })], {});
    expect(plan.creates).toHaveLength(0);
  });
});

describe("linksAfterWrites", () => {
  it("keeps the old link when a write failed, so the next run retries instead of duplicating", () => {
    // The failed follow-up is absent from `created`; its link must survive or
    // the retry would create a second event beside the one it could not update.
    expect(linksAfterWrites({ "fu-1": "evt-1" }, {}, [])).toEqual({ "fu-1": "evt-1" });
  });

  it("records new events and forgets removed ones", () => {
    expect(linksAfterWrites({ "fu-1": "evt-1" }, { "fu-2": "evt-2" }, ["fu-1"])).toEqual({
      "fu-2": "evt-2",
    });
  });
});

describe("toDeviceDates", () => {
  const start = new Date("2026-08-04T00:00:00.000Z");
  const exclusiveEnd = new Date("2026-08-05T00:00:00.000Z");

  it("pulls an all-day end back a day on iOS, whose end date is INCLUSIVE", () => {
    // EventKit reads the end as the last day covered, so passing the exclusive
    // end would show the user a two-day follow-up.
    const dates = toDeviceDates("ios", {
      title: "t",
      start,
      end: exclusiveEnd,
      allDay: true,
    });
    expect(dates.endDate.toISOString()).toBe(start.toISOString());
  });

  it("keeps the exclusive end on Android, whose CalendarContract wants midnight after", () => {
    const dates = toDeviceDates("android", {
      title: "t",
      start,
      end: exclusiveEnd,
      allDay: true,
    });
    expect(dates.endDate.toISOString()).toBe(exclusiveEnd.toISOString());
  });

  it("leaves timed events alone on both platforms — only the all-day convention differs", () => {
    const dates = toDeviceDates("ios", { title: "t", start, end: exclusiveEnd, allDay: false });
    expect(dates.endDate.toISOString()).toBe(exclusiveEnd.toISOString());
  });
});
