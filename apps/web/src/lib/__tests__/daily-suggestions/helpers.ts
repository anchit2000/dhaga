import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { emptyExtractedContact, type BusyInterval } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import type { DailySuggestion } from "@/lib/repo/daily-suggestions";
import type { SchedulePrefs } from "@/lib/repo/suggestion-settings";

/**
 * Fixtures shared by the daily-suggestion DB specs. Each spec file boots its own
 * PGlite, so nothing here may assume an empty database or an execution order:
 * every helper is scoped to the contact it is handed, and every spec asserts
 * about its OWN ids rather than about the shape of the whole list.
 */

/** UTC, so "today" in the suggestion engine matches `Date.UTC(...)` maths here. */
export const utcPrefs: SchedulePrefs = {
  startHour: 9,
  endHour: 17,
  overloadThreshold: 5,
  utcOffsetMinutes: 0,
  timezone: "UTC",
};

/** A uniquely named contact, so `createContactProfile`'s mentioned-stub merge
 *  (it adopts an existing stub of the same name) can never fuse two fixtures. */
export async function newContact(prefix: string): Promise<string> {
  return createContact({ ...emptyExtractedContact(), name: `${prefix} ${randomUUID()}` }, "manual");
}

/**
 * Make a contact genuinely overdue.
 *
 * `createdAt` is back-dated ALONGSIDE `lastReachedOutAt` because last touch is
 * `GREATEST(createdAt, lastReachedOutAt, newest note, newest event scan)` — with
 * `createdAt` left at now, "reached out 3 days ago" loses to "captured just now"
 * and the contact is correctly NOT due. Real data cannot say "I reached out
 * before I captured them", so a fixture that does is testing a state the product
 * can never reach. (Under the older `COALESCE(lastReachedOutAt, createdAt)` it
 * happened to work, which is why the fixture survived this long.)
 */
export async function makeDue(id: string, everyDays: number, daysAgo: number): Promise<void> {
  const db = await getDb();
  const past = sql`now() - make_interval(days => ${daysAgo})`;
  await db
    .update(contacts)
    .set({ reachOutEveryDays: everyDays, lastReachedOutAt: past, createdAt: past })
    .where(eq(contacts.id, id));
}

/** Give a contact a birthday falling on `now`'s UTC calendar day. */
export async function setBirthdayToday(id: string, now: Date): Promise<void> {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const db = await getDb();
  await db
    .update(contacts)
    .set({ importantDates: [{ label: "Birthday", value: `1990-${month}-${day}`, note: null }] })
    .where(eq(contacts.id, id));
}

/** `count` half-hour meetings inside `day`'s UTC calendar day, from 09:00. */
export function meetingsOn(day: Date, count: number): BusyInterval[] {
  const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return Array.from({ length: count }, (_, i) => ({
    start: new Date(midnight + (9 + i) * 3_600_000),
    end: new Date(midnight + (9 + i) * 3_600_000 + 1_800_000),
  }));
}

export function has(suggestions: DailySuggestion[], id: string): boolean {
  return suggestions.some((item) => item.contactId === id);
}

export function rankOf(suggestions: DailySuggestion[], id: string): number {
  return suggestions.findIndex((item) => item.contactId === id);
}
