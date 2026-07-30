import { differenceInCalendarDays, isBefore, isToday, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  isDueSoon,
  isDueWithinEmailLeadWindow,
} from "@/lib/repo/reminders/calendar";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * Reminder day boundaries are the user's, not the server's. What these cases pin
 * is product behaviour, not arithmetic:
 *  - the SAME instant is a different calendar day in two zones, so "due today"
 *    and "overdue" must move with the user. Before this, a user in UTC-7 saw a
 *    follow-up go "overdue" at 17:00 the day BEFORE it was due, and a user in
 *    UTC+5:30 saw it stay green until 05:30 the day AFTER.
 *  - an unset timezone (SchedulePrefs default "UTC") must produce byte-identical
 *    results to the date-fns implementation this replaced. That is the property
 *    that makes the change shippable to existing users: hosted, server-local IS
 *    UTC, so nobody who never opened Settings sees anything change.
 *  - the bell's narrow predicate and the email's lead window stay distinct
 *    (see jobs/follow-up-reminders.test.ts) — moving the boundary must not
 *    quietly widen either set.
 */

const LOS_ANGELES = "America/Los_Angeles"; // UTC-7 in July
const KOLKATA = "Asia/Kolkata"; // UTC+5:30
const UTC = "UTC";

function makeItem(overrides: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "f1",
    contactId: "c1",
    contactName: "Ada Lovelace",
    action: "Send the deck",
    dueDate: null,
    dueHint: null,
    overdue: false,
    ...overrides,
  };
}

/**
 * 2026-07-31T04:00:00Z is 30 July 21:00 in Los Angeles and 31 July 09:30 in
 * Kolkata — one instant, two calendar days. Every case below uses it, so any
 * difference in outcome is the zone and nothing else.
 */
const NOW = new Date("2026-07-31T04:00:00Z");
/** Due on 30 July in both zones (05:00 in LA, 17:30 in Kolkata). */
const DUE_30_JULY = "2026-07-30T12:00:00Z";

describe("the day boundary follows the user's timezone", () => {
  it("is due TODAY in Los Angeles and already PAST in Kolkata for the same instant", () => {
    const item = makeItem({ dueDate: DUE_30_JULY });
    // 0 ⇒ due today; < 0 is exactly the comparison getCalendarFollowUps uses to
    // set `overdue`, so this is the bell's badge flipping, not an abstract number.
    expect(daysUntilDue(item.dueDate, NOW, LOS_ANGELES)).toBe(0);
    expect(daysUntilDue(item.dueDate, NOW, KOLKATA)).toBe(-1);
    expect(daysUntilDue(item.dueDate, NOW, KOLKATA)! < 0).toBe(true);
  });

  it("keeps a due-today item out of 'overdue' for the user still on that day", () => {
    // The visible regression this prevents: the LA user's follow-up must not read
    // as late while it is still the afternoon of the day it is due.
    const item = makeItem({ dueDate: DUE_30_JULY });
    expect(isDueSoon(item, NOW, LOS_ANGELES)).toBe(true);
    // Kolkata is on the next day already: not due TODAY there — the repo layer
    // marks it overdue from the same `< 0`, and the bell counts it as such.
    expect(daysUntilDue(item.dueDate, NOW, KOLKATA)).toBeLessThan(0);
    expect(isDueSoon(makeItem({ dueDate: DUE_30_JULY, overdue: true }), NOW, KOLKATA)).toBe(true);
  });

  it("counts the email lead window in the user's days, not the server's", () => {
    // Due 2 Aug: 3 days out from LA's 30 July (inside the window), 2 from
    // Kolkata's 31 July. A server-day count would put the LA user at 2 and
    // silently email them a day later than intended.
    const item = makeItem({ dueDate: "2026-08-02T12:00:00Z" });
    expect(daysUntilDue(item.dueDate, NOW, LOS_ANGELES)).toBe(FOLLOW_UP_LEAD_DAYS);
    expect(daysUntilDue(item.dueDate, NOW, KOLKATA)).toBe(2);
    expect(isDueWithinEmailLeadWindow(item, NOW, LOS_ANGELES)).toBe(true);
    expect(isDueWithinEmailLeadWindow(item, NOW, KOLKATA)).toBe(true);
    // ...and the window's far edge still closes in each zone's own days.
    const later = makeItem({ dueDate: "2026-08-03T12:00:00Z" });
    expect(isDueWithinEmailLeadWindow(later, NOW, LOS_ANGELES)).toBe(false);
    expect(isDueWithinEmailLeadWindow(later, NOW, KOLKATA)).toBe(true);
  });

  it("never treats an undated follow-up as due or overdue in any zone", () => {
    const item = makeItem({ dueDate: null });
    expect(daysUntilDue(item.dueDate, NOW, KOLKATA)).toBeNull();
    expect(isDueSoon(item, NOW, KOLKATA)).toBe(false);
    expect(isDueWithinEmailLeadWindow(item, NOW, LOS_ANGELES)).toBe(false);
  });
});

/**
 * THE NO-REGRESSION GUARANTEE. `SchedulePrefs.timezone` defaults to "UTC" and
 * hosted server-local IS UTC, so a user who never picked a zone must get exactly
 * what the previous date-fns implementation gave. The oracles below ARE that
 * implementation (isBefore/startOfDay, isToday, differenceInCalendarDays); if the
 * zone-aware code ever disagrees with them, existing users' badges shifted.
 */
describe("an unset timezone is a no-op", () => {
  /** The old `overdue`: due date strictly before the start of the server's today. */
  function oldOverdue(dueDate: string, now: Date): boolean {
    return isBefore(new Date(dueDate), startOfDay(now));
  }
  /** The old day count behind both the bell's due-today and the email window. */
  function oldDays(dueDate: string, now: Date): number {
    return differenceInCalendarDays(new Date(dueDate), now);
  }

  const hostZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dueDates = [
    "2026-07-29T23:30:00Z",
    "2026-07-30T00:30:00Z",
    "2026-07-31T04:00:00Z",
    "2026-08-02T18:00:00Z",
    "2026-08-03T00:00:00Z",
    "2026-08-30T09:00:00Z",
  ];

  it("matches the date-fns day count it replaced, in the host's own zone", () => {
    // Run in the HOST zone (what date-fns reads) so this holds on any dev
    // machine, not only a UTC CI box — the default parameter is that zone.
    for (const dueDate of dueDates) {
      expect(daysUntilDue(dueDate, NOW, hostZone)).toBe(oldDays(dueDate, NOW));
    }
  });

  it("reproduces the old overdue and due-today classification exactly", () => {
    for (const dueDate of dueDates) {
      const days = daysUntilDue(dueDate, NOW, hostZone)!;
      expect(days < 0).toBe(oldOverdue(dueDate, NOW));
      // isToday reads the real clock, so compare against `now = new Date()`.
      expect(daysUntilDue(dueDate, new Date(), hostZone) === 0).toBe(isToday(new Date(dueDate)));
    }
  });

  it("gives UTC callers the UTC calendar day — what Vercel's server-local already was", () => {
    // Independent of date-fns and of the host zone: the UTC day of an instant is
    // the leading 10 characters of its ISO form. This is the assertion that
    // fails if "UTC" ever silently resolves to something else.
    for (const dueDate of dueDates) {
      const utcDayDiff = daysUntilDue(dueDate, NOW, UTC);
      const asDay = (value: string): string => new Date(value).toISOString().slice(0, 10);
      const expected = Math.round(
        (Date.parse(`${asDay(dueDate)}T00:00:00Z`) - Date.parse(`${asDay(NOW.toISOString())}T00:00:00Z`)) /
          86_400_000,
      );
      expect(utcDayDiff).toBe(expected);
    }
  });

  it("leaves the default-argument predicates behaving as they did", () => {
    // No zone passed anywhere: this is every caller that has no user zone to
    // hand (and every existing call site) — it must keep the ambient answer.
    const dueToday = makeItem({ dueDate: new Date().toISOString() });
    expect(isDueSoon(dueToday)).toBe(true);
    expect(isDueWithinEmailLeadWindow(dueToday)).toBe(true);
    const farOff = makeItem({ dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString() });
    expect(isDueSoon(farOff)).toBe(false);
    expect(isDueWithinEmailLeadWindow(farOff)).toBe(false);
  });
});
