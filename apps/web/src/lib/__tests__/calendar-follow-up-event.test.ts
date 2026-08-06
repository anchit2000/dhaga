import { describe, expect, it } from "vitest";
import { followUpToCalendarEvent } from "@dhaga/core";

/**
 * The follow-up → calendar-event mapping is where write-out gets its honesty:
 * returning null is not an edge case, it is the instruction to REMOVE whatever
 * we previously wrote. A follow-up the user completed or dismissed must not be
 * left sitting on their calendar, and an undated one has no day to sit on.
 */

const DUE = new Date("2026-08-03T00:00:00Z");

describe("followUpToCalendarEvent", () => {
  it("maps an open dated follow-up to a one-day all-day event naming the contact", () => {
    const event = followUpToCalendarEvent({
      contactName: "Ada Lovelace",
      action: "Send the deck",
      dueDate: DUE,
      status: "open",
    });
    expect(event).toEqual({
      title: "Follow up: Ada Lovelace",
      start: DUE,
      // Exclusive end — one day long, the shape both Google and Graph want.
      end: new Date("2026-08-04T00:00:00Z"),
      allDay: true,
      description: "Send the deck",
    });
  });

  it("uses an unlinked task's action as its useful calendar title", () => {
    expect(followUpToCalendarEvent({
      contactName: null,
      action: "Reconcile the shop accounts",
      dueDate: DUE,
      status: "open",
    })?.title).toBe("Reconcile the shop accounts");
  });

  it.each([["done"], ["dismissed"]])(
    "returns no event for a %s follow-up so it cannot linger on the calendar",
    (status) => {
      expect(
        followUpToCalendarEvent({ contactName: "Ada", action: "Ping", dueDate: DUE, status }),
      ).toBeNull();
    },
  );

  it("returns no event for an undated follow-up — there is no day to put it on", () => {
    expect(
      followUpToCalendarEvent({ contactName: "Ada", action: "Ping", dueDate: null, status: "open" }),
    ).toBeNull();
  });

  it("returns no event when the action is blank — an empty chip helps nobody", () => {
    expect(
      followUpToCalendarEvent({ contactName: "Ada", action: "   ", dueDate: DUE, status: "open" }),
    ).toBeNull();
  });
});
