import { getSchedulePrefs } from "@/lib/repo/suggestion-settings";
import { zonedParts } from "@/lib/time/zone";
import type { CalendarDay } from "@dhaga/core";

/**
 * "Which day is it for THIS user?" — the one place the reminder repo turns the
 * server's clock into the user's calendar.
 *
 * Every reminder surface (bell badge, calendar grid, follow-ups page, reminder
 * emails) has to agree on where a day starts, and the answer is the user's stored
 * IANA zone, not the server's. Both files here read it through these helpers so
 * the lookup happens once per public call and the maths stays in @dhaga/core,
 * which cannot do zones (see packages/core/src/dates/calendar-day.ts).
 *
 * ONE sequential await, never a Promise.all alongside the row query: the tenant
 * pool tops out at 3 connections, and getDb() reuses the request-scoped one only
 * when reads are sequential (see lib/db/request-scope.ts).
 *
 * Default is "UTC" (see SchedulePrefs.timezone), which is also server-local in
 * hosted mode — so a user who never picked a zone sees exactly what they saw
 * before this existed.
 */
export async function userTimeZone(): Promise<string> {
  return (await getSchedulePrefs()).timezone;
}

/**
 * The user's calendar day for an instant. `ZonedParts` is structurally a
 * `CalendarDay`, which is the whole point of that seam — no adapter, no
 * re-derivation, and no `Intl` inside @dhaga/core.
 */
export function localDay(now: Date, timeZone: string): CalendarDay {
  return zonedParts(now, timeZone);
}

/** Convenience for the common case: today, in the scoped user's zone. */
export async function userToday(now: Date = new Date()): Promise<CalendarDay> {
  return localDay(now, await userTimeZone());
}
