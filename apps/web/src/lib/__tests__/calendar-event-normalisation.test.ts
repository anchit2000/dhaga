import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleCalendarProvider, MicrosoftCalendarProvider } from "@dhaga/core";

/**
 * Two providers, two wire formats, one CalendarEvent shape — because /app/calendar
 * renders whatever comes back without knowing which calendar it came from. The
 * cases pinned here are the ones that silently corrupt a calendar view if they
 * regress: a cancelled event that must not appear, an all-day event whose UTC
 * midnight would land it on the wrong day, and an untitled event that must
 * surface as `null` rather than an empty string the UI would render as a blank.
 */

const RANGE = { from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-31T00:00:00Z") };

function respondWith(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GoogleCalendarProvider.listEvents", () => {
  it("normalises timed and all-day events, and drops cancelled ones", async () => {
    respondWith({
      items: [
        {
          id: "timed",
          status: "confirmed",
          summary: "Coffee with Ada",
          location: "Blue Bottle",
          start: { dateTime: "2026-08-03T09:00:00Z" },
          end: { dateTime: "2026-08-03T10:00:00Z" },
          attendees: [{ email: "ada@example.test", displayName: "Ada" }],
        },
        {
          id: "allday",
          status: "confirmed",
          start: { date: "2026-08-05" },
          end: { date: "2026-08-06" },
        },
        {
          id: "gone",
          status: "cancelled",
          summary: "Deleted",
          start: { dateTime: "2026-08-04T09:00:00Z" },
          end: { dateTime: "2026-08-04T10:00:00Z" },
        },
      ],
    });

    const events = await new GoogleCalendarProvider().listEvents!({
      accessToken: "token",
      range: RANGE,
    });

    expect(events.map((event) => event.id)).toEqual(["timed", "allday"]);
    expect(events[0]).toEqual({
      id: "timed",
      title: "Coffee with Ada",
      start: new Date("2026-08-03T09:00:00Z"),
      end: new Date("2026-08-03T10:00:00Z"),
      allDay: false,
      location: "Blue Bottle",
      attendees: ["Ada"],
    });
    // An untitled all-day event: null title (never ""), and midnight-UTC bounds
    // so the day cell is the one Google meant.
    expect(events[1]).toMatchObject({
      title: null,
      allDay: true,
      start: new Date("2026-08-05T00:00:00Z"),
      end: new Date("2026-08-06T00:00:00Z"),
      location: null,
      attendees: [],
    });
  });

  it("surfaces the HTTP status and nothing from the body, which can hold PII", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Coffee with Ada" }), { status: 403 })),
    );
    await expect(
      new GoogleCalendarProvider().listEvents!({ accessToken: "token", range: RANGE }),
    ).rejects.toThrow(/403/);
    await expect(
      new GoogleCalendarProvider().listEvents!({ accessToken: "token", range: RANGE }),
    ).rejects.not.toThrow(/Coffee/);
  });
});

describe("MicrosoftCalendarProvider.listEvents", () => {
  it("normalises Graph's Z-less UTC stamps and its all-day shape", async () => {
    respondWith({
      value: [
        {
          id: "timed",
          subject: "Coffee with Ada",
          isAllDay: false,
          start: { dateTime: "2026-08-03T09:00:00.0000000" },
          end: { dateTime: "2026-08-03T10:00:00.0000000" },
          location: { displayName: "Blue Bottle" },
          attendees: [{ emailAddress: { name: "Ada", address: "ada@example.test" } }],
        },
        {
          id: "allday",
          isAllDay: true,
          start: { dateTime: "2026-08-05T00:00:00.0000000" },
          end: { dateTime: "2026-08-06T00:00:00.0000000" },
          location: { displayName: "" },
        },
      ],
    });

    const events = await new MicrosoftCalendarProvider().listEvents!({
      accessToken: "token",
      range: RANGE,
    });

    expect(events[0]).toEqual({
      id: "timed",
      title: "Coffee with Ada",
      // Graph omits the trailing Z; reading it as local time would shift the
      // event by the server's offset.
      start: new Date("2026-08-03T09:00:00Z"),
      end: new Date("2026-08-03T10:00:00Z"),
      allDay: false,
      location: "Blue Bottle",
      attendees: ["Ada"],
    });
    expect(events[1]).toMatchObject({ title: null, allDay: true, location: null, attendees: [] });
  });
});
