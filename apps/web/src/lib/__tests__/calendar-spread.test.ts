import { describe, expect, it } from "vitest";
import { spreadAcrossWeek, type SpreadItem } from "@dhaga/core";

const weekStart = new Date("2026-07-13T00:00:00Z"); // a Monday
const items = (n: number): SpreadItem<string>[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, item: `c${i}` }));

describe("spreadAcrossWeek", () => {
  it("never puts more than perDay people on any single day — the anti-cluster guarantee", () => {
    const { days, overflow } = spreadAcrossWeek({ items: items(10), weekStart, perDay: 2 });
    expect(days).toHaveLength(7);
    for (const day of days) expect(day.items.length).toBeLessThanOrEqual(2);
    expect(days.reduce((sum, day) => sum + day.items.length, 0)).toBe(10);
    expect(overflow).toHaveLength(0);
  });

  it("is deterministic — the same inputs produce byte-identical assignment (list must not churn)", () => {
    const a = spreadAcrossWeek({ items: items(9), weekStart, perDay: 2 });
    const b = spreadAcrossWeek({ items: items(9), weekStart, perDay: 2 });
    const ids = (r: typeof a): string[][] => r.days.map((day) => day.items);
    expect(ids(a)).toEqual(ids(b));
  });

  it("respects per-day capacity so a calendar-busy day takes fewer people", () => {
    const { days } = spreadAcrossWeek({
      items: items(10),
      weekStart,
      perDay: 2,
      dayCapacities: [0, 2, 2, 2, 2, 2, 2], // Monday fully booked
    });
    expect(days[0].items).toHaveLength(0);
    expect(days.reduce((sum, day) => sum + day.items.length, 0)).toBe(10);
  });

  it("returns the remainder as overflow when the week can't hold everyone", () => {
    const { days, overflow } = spreadAcrossWeek({ items: items(20), weekStart, perDay: 2 });
    expect(days.reduce((sum, day) => sum + day.items.length, 0)).toBe(14);
    expect(overflow).toHaveLength(6);
  });
});
