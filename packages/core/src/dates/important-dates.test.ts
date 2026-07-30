/**
 * Every important-date reminder the product sends is derived from these four
 * functions, so what they encode is product behaviour, not formatting:
 *  - parseImportantDate is the gate between "we can remind you" and silence.
 *    `ImportantDate.value` is free text (Google import writes prose), so a false
 *    positive invents a birthday on a wrong day and a false negative drops a
 *    real one. Year-less MM-DD must survive — most imported birthdays have no year.
 *  - nextImportantDateOccurrence must treat TODAY as the occurrence. If today's
 *    birthday rolled to next year, the reminder would vanish on the one morning
 *    the user needs it.
 *  - 29 Feb must resolve every year (28 Feb in a non-leap year), or 3 users in 4
 *    born on a leap day get no reminder for three years running.
 *  - daysUntil must count CALENDAR days, not elapsed ms: "tomorrow" at 23:00 is
 *    1 day away, and a lead-days window computed off raw ms silently drops the
 *    last day of the window.
 *  - a CalendarDay caller must get the answer for THAT day, not for the day the
 *    server's clock happens to be on. A user in UTC-7 must not see a birthday
 *    shift by one for the seven hours a day their date differs from the host's.
 */
import { describe, it, expect } from "vitest";
import {
  daysUntil,
  formatCalendarDate,
  importantDateOccurrencesInRange,
  nextImportantDateOccurrence,
  parseImportantDate,
  yearsTurning,
} from "./important-dates";

/** Local midnight, matching how the module builds every calendar date. */
function day(year: number, month: number, date: number, hour = 0): Date {
  return new Date(year, month - 1, date, hour);
}

describe("parseImportantDate", () => {
  it("parses a full ISO date, keeping the year for age display", () => {
    expect(parseImportantDate("1990-03-14")).toEqual({ month: 3, day: 14, year: 1990 });
  });

  it("parses a year-less MM-DD with year null", () => {
    // WHY: most imported birthdays carry no year. Rejecting them (or defaulting
    // the year to 1970) would either kill the reminder or claim an age of 56.
    expect(parseImportantDate("03-14")).toEqual({ month: 3, day: 14, year: null });
  });

  it("returns null for verbatim prose instead of guessing a day", () => {
    // WHY: the import told us it did not know the date. A guessed 1 March
    // reminder is worse than no reminder — it is wrong on the user's behalf.
    expect(parseImportantDate("December 9")).toBeNull();
    expect(parseImportantDate("spring 2019")).toBeNull();
    expect(parseImportantDate("")).toBeNull();
  });

  it("rejects impossible calendar values", () => {
    // WHY: these only reach us as corrupt data, and Date() would silently roll
    // them over (2019-02-30 → 2 March), producing a reminder on a date nobody
    // entered.
    expect(parseImportantDate("2019-02-30")).toBeNull();
    expect(parseImportantDate("2019-13-01")).toBeNull();
    expect(parseImportantDate("2019-04-31")).toBeNull();
    expect(parseImportantDate("02-30")).toBeNull();
  });

  it("keeps 29 Feb when the year is known to be a leap year, drops it when it is not", () => {
    expect(parseImportantDate("2020-02-29")).toEqual({ month: 2, day: 29, year: 2020 });
    expect(parseImportantDate("2019-02-29")).toBeNull();
    // Year-less 02-29 is a real leap-day birthday with an unknown year.
    expect(parseImportantDate("02-29")).toEqual({ month: 2, day: 29, year: null });
  });
});

describe("nextImportantDateOccurrence", () => {
  it("returns TODAY when the date is today", () => {
    const parsed = { month: 7, day: 30, year: 1990 };
    expect(nextImportantDateOccurrence(parsed, day(2026, 7, 30, 23))).toEqual(day(2026, 7, 30));
  });

  it("rolls to next year once the date has passed", () => {
    const parsed = { month: 3, day: 14, year: null };
    expect(nextImportantDateOccurrence(parsed, day(2026, 7, 30))).toEqual(day(2027, 3, 14));
  });

  it("crosses the year boundary the other way: 31 Dec seen from 1 Jan is this year", () => {
    // WHY: a naive "add a year if month < current month" check would push a
    // 31 December birthday 12 months out when viewed on New Year's Day.
    const parsed = { month: 12, day: 31, year: null };
    expect(nextImportantDateOccurrence(parsed, day(2026, 1, 1))).toEqual(day(2026, 12, 31));
  });

  it("resolves a 29 Feb date to 28 Feb in a non-leap year, and to 29 Feb in a leap year", () => {
    const parsed = { month: 2, day: 29, year: 1992 };
    expect(nextImportantDateOccurrence(parsed, day(2027, 1, 1))).toEqual(day(2027, 2, 28));
    expect(nextImportantDateOccurrence(parsed, day(2028, 1, 1))).toEqual(day(2028, 2, 29));
  });
});

describe("importantDateOccurrencesInRange", () => {
  it("includes both endpoints so a window's first and last day still show a date", () => {
    const parsed = { month: 3, day: 14, year: null };
    expect(importantDateOccurrencesInRange(parsed, day(2026, 3, 14), day(2026, 3, 14))).toEqual([
      day(2026, 3, 14),
    ]);
  });

  it("returns one occurrence per year a multi-year range spans", () => {
    // WHY: the calendar grid can be paged across a year boundary; missing the
    // second year would leave the December-to-February view half empty.
    const parsed = { month: 1, day: 5, year: null };
    expect(importantDateOccurrencesInRange(parsed, day(2025, 12, 1), day(2027, 2, 1))).toEqual([
      day(2026, 1, 5),
      day(2027, 1, 5),
    ]);
  });

  it("returns nothing when the date falls outside the window", () => {
    const parsed = { month: 9, day: 1, year: null };
    expect(importantDateOccurrencesInRange(parsed, day(2026, 3, 1), day(2026, 5, 31))).toEqual([]);
  });
});

describe("daysUntil", () => {
  it("counts calendar days, not elapsed hours", () => {
    // WHY: 23:00 today → 01:00 tomorrow is 2 hours apart but ONE day away. A
    // ms-based floor would report 0 and file tomorrow's birthday under "today".
    expect(daysUntil(day(2026, 7, 31, 1), day(2026, 7, 30, 23))).toBe(1);
  });

  it("is 0 for the same calendar day whatever the times are", () => {
    expect(daysUntil(day(2026, 7, 30, 23), day(2026, 7, 30, 1))).toBe(0);
  });

  it("is negative for a past date, so a calendar window can show one", () => {
    expect(daysUntil(day(2026, 7, 28), day(2026, 7, 30))).toBe(-2);
  });
});

describe("yearsTurning", () => {
  it("is the age on that occurrence when the birth year is known", () => {
    expect(yearsTurning({ month: 3, day: 14, year: 1990 }, day(2027, 3, 14))).toBe(37);
  });

  it("is null with no stored year, so no surface can render a fabricated age", () => {
    expect(yearsTurning({ month: 3, day: 14, year: null }, day(2027, 3, 14))).toBeNull();
  });
});

describe("formatCalendarDate", () => {
  it("serialises the LOCAL day, not a UTC-shifted one", () => {
    // WHY: toISOString() on a local-midnight Date west of Greenwich yields the
    // previous day — the exact bug that would show a birthday 24h early.
    expect(formatCalendarDate(day(2026, 1, 5, 23))).toBe("2026-01-05");
  });

  it("serialises a CalendarDay verbatim — the day the caller resolved wins", () => {
    // The web layer resolves the user's day from their IANA zone and passes it
    // in; if this re-derived anything from a clock, the two could disagree.
    expect(formatCalendarDate({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
  });
});

/**
 * THE ZONE SEAM. `Intl` cannot live in this package (Hermes), so the caller
 * resolves "which day is it where the user is" and hands it over as a
 * CalendarDay. These cases pin that a CalendarDay caller gets the answer for THAT
 * day — otherwise the whole timezone feature silently falls back to the server's
 * calendar, which is the bug it exists to fix.
 */
describe("CalendarDay inputs (the caller-resolved day)", () => {
  const bornLeapDay = { month: 2, day: 29, year: 1992 };

  it("treats the caller's day as today, so a birthday on it is 0 days away", () => {
    // WHY IT MATTERS: for a user in UTC-7 after 17:00 local, the SERVER is
    // already on tomorrow. Reading the server's day would report their birthday
    // as yesterday's (-1) and drop it out of the upcoming window entirely.
    const userToday = { year: 2026, month: 7, day: 30 };
    const parsed = { month: 7, day: 30, year: 1990 };
    const occurrence = nextImportantDateOccurrence(parsed, userToday);
    expect(formatCalendarDate(occurrence)).toBe("2026-07-30");
    expect(daysUntil(occurrence, userToday)).toBe(0);
  });

  it("does not shift a birthday for a user west of UTC", () => {
    // Same instant, two zones: 2026-07-31T02:00Z is still 30 July in
    // Los_Angeles (UTC-7) and already 31 July in UTC. The user west of UTC must
    // still see their 30 July birthday as TODAY, not as a year away.
    const inLosAngeles = { year: 2026, month: 7, day: 30 };
    const inUtc = { year: 2026, month: 7, day: 31 };
    const parsed = { month: 7, day: 30, year: null };
    expect(daysUntil(nextImportantDateOccurrence(parsed, inLosAngeles), inLosAngeles)).toBe(0);
    // The host-day reading is what this feature exists to stop: a year out.
    expect(daysUntil(nextImportantDateOccurrence(parsed, inUtc), inUtc)).toBe(364);
  });

  it("counts calendar days between two CalendarDays across a month boundary", () => {
    expect(daysUntil({ year: 2026, month: 8, day: 2 }, { year: 2026, month: 7, day: 30 })).toBe(3);
    expect(daysUntil({ year: 2026, month: 7, day: 28 }, { year: 2026, month: 7, day: 30 })).toBe(-2);
  });

  it("keeps the Feb-29 rule and the year roll-over for CalendarDay callers", () => {
    // The rules are the module's product behaviour, not an artefact of taking a
    // Date: 29 Feb clamps to 28 Feb in a non-leap year on either input type.
    expect(formatCalendarDate(nextImportantDateOccurrence(bornLeapDay, { year: 2027, month: 1, day: 1 }))).toBe("2027-02-28");
    expect(formatCalendarDate(nextImportantDateOccurrence(bornLeapDay, { year: 2028, month: 1, day: 1 }))).toBe("2028-02-29");
    // Passed date already gone this year ⇒ next year's occurrence.
    expect(
      formatCalendarDate(nextImportantDateOccurrence(bornLeapDay, { year: 2027, month: 6, day: 1 })),
    ).toBe("2028-02-29");
  });

  it("agrees with the equivalent Date input, so nothing regresses for old callers", () => {
    // THE NO-REGRESSION PROPERTY, in core's terms: a CalendarDay built from a
    // Date's own local parts must produce byte-identical answers. Every existing
    // caller passes a Date, and none of them may change behaviour.
    const from = day(2026, 3, 14, 23);
    const asDay = { year: 2026, month: 3, day: 14 };
    const parsed = { month: 3, day: 14, year: 1990 };
    expect(nextImportantDateOccurrence(parsed, asDay)).toEqual(
      nextImportantDateOccurrence(parsed, from),
    );
    expect(daysUntil(day(2026, 3, 20), asDay)).toBe(daysUntil(day(2026, 3, 20), from));
    expect(formatCalendarDate(asDay)).toBe(formatCalendarDate(from));
    expect(yearsTurning(parsed, asDay)).toBe(yearsTurning(parsed, from));
    expect(importantDateOccurrencesInRange(parsed, asDay, { year: 2027, month: 4, day: 1 })).toEqual(
      importantDateOccurrencesInRange(parsed, from, day(2027, 4, 1)),
    );
  });
});
