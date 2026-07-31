import { describe, expect, it } from "vitest";

import { calendarNotice, dhagaCalendarSource, findDhagaCalendar } from "../target";
import {
  ANDROID_CALENDAR_NOTICE,
  ANDROID_LOCAL_SOURCE,
  LOCAL_CALENDAR_NOTICE,
} from "@/utils/constants/calendar";

import type { DeviceCalendar } from "../types";

function calendar(overrides: Partial<DeviceCalendar> = {}): DeviceCalendar {
  return {
    id: "cal-1",
    title: "Dhaga",
    allowsModifications: true,
    source: { name: "iCloud", type: "caldav" },
    ...overrides,
  };
}

describe("findDhagaCalendar", () => {
  it("adopts the calendar Dhaga made so a second run updates events instead of duplicating them", () => {
    expect(findDhagaCalendar([calendar({ title: "Home" }), calendar({ id: "cal-2" })])?.id).toBe(
      "cal-2",
    );
  });

  it("matches regardless of case and padding, because the OS may normalise what it stored", () => {
    expect(findDhagaCalendar([calendar({ title: "  dhaga " })])).not.toBeNull();
  });

  it("REFUSES the account's primary calendar even when it is named Dhaga", () => {
    // The product promise is that Dhaga writes only into its own calendar. A
    // user who renamed their primary calendar must not have Dhaga start filling
    // it — a name match is not permission to write to someone's main calendar.
    expect(findDhagaCalendar([calendar({ isPrimary: true })])).toBeNull();
  });

  it("REFUSES a read-only calendar so a subscription named Dhaga is never adopted", () => {
    // Adopting one would make every write fail silently and leave the user with
    // a calendar feature that reports success and does nothing.
    expect(findDhagaCalendar([calendar({ allowsModifications: false })])).toBeNull();
  });

  it("returns null when there is no Dhaga calendar, so the caller creates one", () => {
    expect(findDhagaCalendar([calendar({ title: "Work" })])).toBeNull();
  });
});

describe("dhagaCalendarSource", () => {
  it("files the new iOS calendar in the DEFAULT CALENDAR'S ACCOUNT so follow-ups reach the user's other devices", () => {
    // This is the whole phone-relay premise: a calendar in the iCloud source
    // syncs onward with zero OAuth. Filing it locally would strand every
    // follow-up on this one phone.
    const source = dhagaCalendarSource("ios", { id: "src-icloud", name: "iCloud", type: "caldav" });
    expect(source.sourceId).toBe("src-icloud");
    expect(source.source.type).toBe("caldav");
  });

  it("falls back to a local account on iOS when no default calendar can be read", () => {
    expect(dhagaCalendarSource("ios", null).source).toEqual({ ...ANDROID_LOCAL_SOURCE });
  });

  it("uses a local account on Android, with the name + ownerAccount the platform demands", () => {
    // Android rejects a calendar insert without ownerAccount/name, and a
    // calendar filed under a Google account is never picked up by Google's sync
    // adapter — it would look synced and never leave the phone.
    const source = dhagaCalendarSource("android", { name: "user@gmail.com", type: "com.google" });
    expect(source.source).toEqual({ ...ANDROID_LOCAL_SOURCE });
    expect(source.ownerAccount).toBe("Dhaga");
    expect(source.name).toBe("Dhaga");
  });
});

describe("calendarNotice", () => {
  it("says nothing when a remote iOS account will carry the follow-ups onward", () => {
    expect(calendarNotice("ios", { type: "caldav" })).toBeNull();
  });

  it("warns when the iOS calendar is device-local, because the user would otherwise assume it syncs", () => {
    expect(calendarNotice("ios", { type: "local" })).toBe(LOCAL_CALENDAR_NOTICE);
  });

  it("always warns on Android, where Dhaga cannot reach a cloud account at all", () => {
    expect(calendarNotice("android", { type: "com.google" })).toBe(ANDROID_CALENDAR_NOTICE);
  });
});
