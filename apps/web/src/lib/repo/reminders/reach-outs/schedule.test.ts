import { describe, expect, it } from "vitest";
import { isReachOutDue, nextReachOutDay } from "./schedule";
import type { ReachOutScheduleFields } from "@/types";

function fields(
  frequency: string,
  interval: number,
  weekday: number | null,
  monthDay: number | null,
  month: number | null,
): ReachOutScheduleFields {
  return {
    reachOutRecurrenceFrequency: frequency,
    reachOutRecurrenceInterval: interval,
    reachOutRecurrenceWeekday: weekday,
    reachOutRecurrenceMonthDay: monthDay,
    reachOutRecurrenceMonth: month,
  };
}

describe("calendar-aware keep-in-touch due dates", () => {
  it("uses the user's day boundary for a selected weekday", () => {
    const rule = fields("weekly", 1, 4, null, null);
    const lastTouch = new Date("2026-08-06T00:00:00.000Z"); // Thursday in both zones
    const now = new Date("2026-08-12T20:00:00.000Z"); // Thursday in India, Wednesday UTC
    expect(isReachOutDue(7, lastTouch, rule, "Asia/Kolkata", now)).toBe(true);
    expect(isReachOutDue(7, lastTouch, rule, "UTC", now)).toBe(false);
  });

  it("clamps a chosen monthly day instead of adding thirty days", () => {
    expect(nextReachOutDay(
      new Date("2026-01-31T12:00:00.000Z"),
      fields("monthly", 1, null, 31, null),
      "UTC",
    )).toEqual({ year: 2026, month: 2, day: 28 });
  });

  it("uses the next named annual date, not a 365-day approximation", () => {
    expect(nextReachOutDay(
      new Date("2026-01-10T12:00:00.000Z"),
      fields("yearly", 1, null, 1, 12),
      "UTC",
    )).toEqual({ year: 2026, month: 12, day: 1 });
  });

  it("keeps legacy day-count rows byte-for-byte compatible", () => {
    const lastTouch = new Date("2026-01-01T12:00:00.000Z");
    expect(isReachOutDue(7, lastTouch, {}, "Asia/Kolkata", new Date("2026-01-08T11:59:59.000Z"))).toBe(false);
    expect(isReachOutDue(7, lastTouch, {}, "Asia/Kolkata", new Date("2026-01-08T12:00:01.000Z"))).toBe(true);
  });
});
