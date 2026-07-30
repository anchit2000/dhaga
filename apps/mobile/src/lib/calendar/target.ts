import { DHAGA_CALENDAR_NAME } from "@dhaga/core/src/calendar/follow-up-event";

import {
  ANDROID_CALENDAR_NOTICE,
  ANDROID_LOCAL_SOURCE,
  ANDROID_OWNER_ACCOUNT,
  LOCAL_CALENDAR_NOTICE,
  LOCAL_SOURCE_TYPES,
} from "@/utils/constants/calendar";

import type { CalendarPlatform, DeviceCalendar } from "./types";

/**
 * Choosing WHERE Dhaga writes. Pure — no native module — because this is the
 * decision that must never go wrong: Dhaga writes into a secondary calendar it
 * owns, named "Dhaga", and into nothing else. The user's default calendar, and
 * every other calendar on the phone, is read-only to this app.
 */

/** The source fields a calendar-creation call needs, minus the enum-typed ones. */
export interface DhagaCalendarSource {
  /** iOS: the account the new calendar is filed under. */
  sourceId?: string;
  source: { id?: string; name: string; type: string; isLocalAccount?: boolean };
  /** Android: internal name + owning account, both required by the platform. */
  name?: string;
  ownerAccount?: string;
}

/**
 * The Dhaga calendar among the phone's calendars, or null if we have not made
 * it yet.
 *
 * Three conditions, each load-bearing:
 *  - title matches DHAGA_CALENDAR_NAME (trimmed, case-insensitive — the OS may
 *    normalise what it stores, and a calendar the user themselves named "Dhaga"
 *    is one they intend for us);
 *  - the calendar is writable, so a read-only subscription that happens to be
 *    called Dhaga is never adopted and then written to;
 *  - it is NOT the account's primary calendar. Android surfaces `isPrimary`,
 *    and a user who renamed their primary calendar must not have Dhaga start
 *    filling it — "never the user's default calendar" is the rule, and a name
 *    match is not permission to break it.
 */
export function findDhagaCalendar(calendars: DeviceCalendar[]): DeviceCalendar | null {
  const wanted = DHAGA_CALENDAR_NAME.trim().toLowerCase();
  return (
    calendars.find(
      (calendar) =>
        calendar.title.trim().toLowerCase() === wanted &&
        calendar.allowsModifications &&
        calendar.isPrimary !== true,
    ) ?? null
  );
}

/**
 * Where a NEW Dhaga calendar should be created.
 *
 * iOS files it under the same source as the user's default calendar — if that
 * is iCloud, the calendar and its follow-ups reach every device signed into the
 * account, which is the whole phone-relay idea behind device-first sync (see
 * ../sync). Filing it in its own local source instead would strand it here.
 * Passing the default calendar's SOURCE is not the same as writing to the
 * default calendar: the new calendar is separate, and only it is ever written.
 *
 * Android gets a local account, because it has to — see ANDROID_LOCAL_SOURCE.
 */
export function dhagaCalendarSource(
  platform: CalendarPlatform,
  defaultSource: { id?: string; name: string; type: string } | null,
): DhagaCalendarSource {
  if (platform === "ios" && defaultSource) {
    return { sourceId: defaultSource.id, source: defaultSource };
  }
  return {
    source: { ...ANDROID_LOCAL_SOURCE },
    name: DHAGA_CALENDAR_NAME,
    ownerAccount: ANDROID_OWNER_ACCOUNT,
  };
}

/**
 * How far the Dhaga calendar's follow-ups actually reach, or null when they
 * reach the user's other devices and there is nothing to warn about. Same
 * contract as containerNotice() in ../sync: a user who believes their
 * follow-ups are on their laptop when they are not has been lied to.
 */
export function calendarNotice(
  platform: CalendarPlatform,
  source: { type: string } | null,
): string | null {
  if (platform === "android") return ANDROID_CALENDAR_NOTICE;
  if (source && LOCAL_SOURCE_TYPES.includes(source.type)) return LOCAL_CALENDAR_NOTICE;
  return null;
}
