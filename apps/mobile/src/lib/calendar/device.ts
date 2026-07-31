import { Platform } from "react-native";
import {
  EntityTypes,
  ExpoCalendar,
  createCalendar,
  getCalendarPermissions,
  getCalendars,
  getDefaultCalendarSync,
  listEvents,
  requestCalendarPermissions,
} from "expo-calendar";
import { DHAGA_CALENDAR_NAME } from "@dhaga/core/src/calendar/follow-up-event";

import { DHAGA_CALENDAR_COLOR } from "@/utils/constants/calendar";

import { dhagaCalendarSource, findDhagaCalendar } from "./target";

import type { CalendarPlatform, DeviceCalendar, DeviceEvent } from "./types";

/**
 * The device calendar as native I/O. Everything here talks to expo-calendar, so
 * none of it runs under vitest — the decisions it makes live in ./target.ts and
 * ./plan.ts, which are pure and tested. This file only carries them out.
 */

export function calendarPlatform(): CalendarPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "other";
}

/**
 * Ask once, honestly. Full (not write-only) access is required because the
 * agenda READS the user's real events — a write-only grant would let Dhaga add
 * follow-ups to a calendar it could never show back.
 */
export async function ensureCalendarPermission(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const current = await getCalendarPermissions();
  if (current.granted) return { granted: true, canAskAgain: true };
  const asked = await requestCalendarPermissions();
  return { granted: asked.granted, canAskAgain: asked.canAskAgain };
}

/** Structural subset the pure selection logic reads (see DeviceCalendar). */
function toDeviceCalendar(calendar: ExpoCalendar): DeviceCalendar {
  return {
    id: calendar.id,
    title: calendar.title,
    allowsModifications: calendar.allowsModifications,
    source: { name: calendar.source.name, type: String(calendar.source.type) },
    isPrimary: calendar.isPrimary,
  };
}

/**
 * The Dhaga calendar, created if this phone does not have one yet.
 *
 * Creation is the ONLY write this feature makes outside that calendar, and it
 * adds a calendar rather than touching an existing one — so the whole feature
 * stays one calendar-deletion away from being undone, exactly like the web
 * write-out (see follow-up-event.ts in @dhaga/core).
 *
 * On iOS the new calendar is filed under the same SOURCE as the user's default
 * calendar so it rides their iCloud/Exchange account to their other devices.
 * That is a read of the default calendar's account, never a write to it.
 */
export async function ensureDhagaCalendar(): Promise<ExpoCalendar> {
  const calendars = await getCalendars(EntityTypes.EVENT);
  const existing = findDhagaCalendar(calendars.map(toDeviceCalendar));
  if (existing) {
    const match = calendars.find((calendar) => calendar.id === existing.id);
    if (match) return match;
  }
  return createCalendar({
    ...dhagaCalendarSource(calendarPlatform(), defaultCalendarSource()),
    title: DHAGA_CALENDAR_NAME,
    color: DHAGA_CALENDAR_COLOR,
    entityType: EntityTypes.EVENT,
  });
}

/**
 * The account the user's default calendar lives in (iOS only — Android has no
 * such call and dhagaCalendarSource ignores this argument there). Null when the
 * platform has no default calendar to read, which is not an error: the Android
 * branch of dhagaCalendarSource is then the correct answer anyway.
 */
function defaultCalendarSource(): { id?: string; name: string; type: string } | null {
  if (calendarPlatform() !== "ios") return null;
  try {
    const source = getDefaultCalendarSync().source;
    return { id: source.id, name: source.name, type: String(source.type) };
  } catch {
    return null;
  }
}

/** The Dhaga calendar's own source, for calendarNotice()'s honesty check. */
export function calendarSourceType(calendar: ExpoCalendar): { type: string } {
  return { type: String(calendar.source.type) };
}

/**
 * Real events from every calendar on the phone, within [from, to). Read-only:
 * nothing on this path writes, and the events never leave the device — they are
 * third-party PII (see the same rule on the web's ExternalCalendarEvent) and
 * are neither uploaded nor logged.
 *
 * The Dhaga calendar's id rides along because it is free here — the calendar
 * list is already in hand — and the agenda needs it to drop our own events.
 * Reading it this way, rather than creating the calendar to ask, is what keeps
 * opening the screen free of side effects.
 */
export async function readDeviceEvents(
  from: Date,
  to: Date,
): Promise<{ events: DeviceEvent[]; dhagaCalendarId: string | null }> {
  const calendars = await getCalendars(EntityTypes.EVENT);
  const dhagaCalendarId = findDhagaCalendar(calendars.map(toDeviceCalendar))?.id ?? null;
  if (calendars.length === 0) return { events: [], dhagaCalendarId };
  const events = await listEvents(calendars, from, to);
  return {
    dhagaCalendarId,
    events: events.map((event) => ({
      id: event.id,
      calendarId: event.calendarId,
      title: event.title,
      // startDate/endDate are `string | Date` depending on platform and how the
      // event was written; normalised here so every consumer holds a real Date.
      start: new Date(event.startDate),
      end: new Date(event.endDate),
      allDay: event.allDay,
    })),
  };
}
