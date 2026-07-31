import { describe, expect, it } from "vitest";

import { buildAgenda, unscheduledFollowUps } from "../agenda";
import { UNTITLED_DEVICE_EVENT } from "@/utils/constants/calendar";

import type { DeviceEvent, FollowUpSummary } from "../types";

/** Local midnight — the agenda groups device events by the phone's own day. */
function localAt(day: number, hour: number): Date {
  return new Date(2026, 7, day, hour, 0, 0);
}

function event(overrides: Partial<DeviceEvent> = {}): DeviceEvent {
  return {
    id: "evt-1",
    calendarId: "cal-work",
    title: "Standup",
    start: localAt(4, 9),
    end: localAt(4, 10),
    allDay: false,
    ...overrides,
  };
}

function followUp(overrides: Partial<FollowUpSummary> = {}): FollowUpSummary {
  return {
    id: "fu-1",
    contactId: "c-1",
    contactName: "Ada Lovelace",
    action: "Send the notes",
    dueDate: "2026-08-04T00:00:00.000Z",
    dueHint: null,
    status: "open",
    ...overrides,
  };
}

const NOW = localAt(4, 12);

describe("buildAgenda", () => {
  it("shows the phone's real events next to Dhaga's follow-ups on the same day", () => {
    // The entire point of the screen: one place for both.
    const [day] = buildAgenda([event()], [followUp()], null, NOW);
    expect(day.items.map((item) => item.kind)).toEqual(["followUp", "event"]);
  });

  it("EXCLUDES events on the Dhaga calendar, which are the follow-ups themselves", () => {
    // They are written by this same feature. Included, every follow-up would
    // appear twice — and only after a sync, which is the worst time to find out.
    const days = buildAgenda(
      [event({ id: "evt-mirror", calendarId: "cal-dhaga", title: "Follow up: Ada Lovelace" })],
      [followUp()],
      "cal-dhaga",
      NOW,
    );
    expect(days[0].items).toHaveLength(1);
    expect(days[0].items[0].kind).toBe("followUp");
  });

  it("puts follow-ups first so a busy day can never bury the work Dhaga is for", () => {
    const [day] = buildAgenda(
      [event({ id: "a", start: localAt(4, 8), end: localAt(4, 9) }), event({ id: "b" })],
      [followUp()],
      null,
      NOW,
    );
    expect(day.items[0].kind).toBe("followUp");
  });

  it("orders a day's events by start time, all-day ones first", () => {
    const [day] = buildAgenda(
      [
        event({ id: "late", start: localAt(4, 17), end: localAt(4, 18) }),
        event({ id: "early", start: localAt(4, 8), end: localAt(4, 9) }),
        event({ id: "allday", allDay: true, start: localAt(4, 0), end: localAt(5, 0) }),
      ],
      [],
      null,
      NOW,
    );
    expect(day.items.map((item) => item.id)).toEqual(["allday", "early", "late"]);
  });

  it("sorts days ascending so the list reads forwards in time", () => {
    const days = buildAgenda(
      [event({ id: "later", start: localAt(6, 9), end: localAt(6, 10) }), event()],
      [],
      null,
      NOW,
    );
    expect(days.map((day) => day.key)).toEqual(["2026-08-04", "2026-08-06"]);
  });

  it("flags a follow-up due before today as overdue, and one due today as not", () => {
    // Overdue drives the only emphasis on the screen; getting it wrong either
    // cries wolf or hides the item the user most needs to see.
    const days = buildAgenda(
      [],
      [
        followUp({ id: "past", dueDate: "2026-08-01T00:00:00.000Z" }),
        followUp({ id: "today", dueDate: "2026-08-04T00:00:00.000Z" }),
      ],
      null,
      NOW,
    );
    const items = days.flatMap((day) => day.items);
    expect(items.map((item) => (item.kind === "followUp" ? item.overdue : null))).toEqual([
      true,
      false,
    ]);
  });

  it("keeps closed follow-ups off the agenda entirely", () => {
    expect(buildAgenda([], [followUp({ status: "done" })], null, NOW)).toEqual([]);
  });

  it("labels an untitled device event rather than rendering a blank row", () => {
    // A private or unnamed block is a real commitment; an empty row is not.
    const [day] = buildAgenda([event({ title: "  " })], [], null, NOW);
    expect(day.items[0].kind === "event" && day.items[0].title).toBe(UNTITLED_DEVICE_EVENT);
  });
});

describe("unscheduledFollowUps", () => {
  it("surfaces open, undated follow-ups so they are not silently lost", () => {
    // They have no day to sit on, but they are still work the user asked for —
    // dropping them without a word would be the screen lying by omission.
    const items = unscheduledFollowUps([
      followUp({ id: "dated" }),
      followUp({ id: "undated", dueDate: null }),
      followUp({ id: "closed", dueDate: null, status: "done" }),
    ]);
    expect(items.map((item) => item.id)).toEqual(["undated"]);
  });
});
