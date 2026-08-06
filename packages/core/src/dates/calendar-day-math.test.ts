import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDayFromUtcDate,
  calendarDayToUtcDate,
  calendarWeekday,
  parseCalendarDate,
} from "./calendar-day-math";

describe("calendar-day maths", () => {
  it("round-trips a date-only value through UTC without inheriting an India offset", () => {
    const day = { year: 2026, month: 8, day: 8 };
    const date = calendarDayToUtcDate(day);
    expect(date.toISOString()).toBe("2026-08-08T00:00:00.000Z");
    expect(calendarDayFromUtcDate(date)).toEqual(day);
  });

  it("crosses leap, month and year boundaries as calendar days", () => {
    expect(addCalendarDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
    expect(addCalendarDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it("rejects impossible ISO days instead of allowing Date rollover", () => {
    expect(parseCalendarDate("2026-02-29")).toBeNull();
    expect(parseCalendarDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseCalendarDate("08/08/2026")).toBeNull();
  });

  it("uses the provider-compatible Sunday-zero weekday numbering", () => {
    expect(calendarWeekday({ year: 2026, month: 8, day: 8 })).toBe(6);
  });
});
