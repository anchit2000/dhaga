import { describe, expect, it } from "vitest";
import { dayLoad, findOpenSlots, isOverloaded, mergeBusy } from "@dhaga/core";

const d = (iso: string): Date => new Date(iso);

describe("mergeBusy", () => {
  it("coalesces overlapping blocks so slot-finding never double-counts a conflict", () => {
    const merged = mergeBusy([
      { start: d("2026-07-15T10:00:00Z"), end: d("2026-07-15T11:00:00Z") },
      { start: d("2026-07-15T10:30:00Z"), end: d("2026-07-15T12:00:00Z") },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].start.toISOString()).toBe("2026-07-15T10:00:00.000Z");
    expect(merged[0].end.toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("keeps disjoint blocks separate", () => {
    const merged = mergeBusy([
      { start: d("2026-07-15T09:00:00Z"), end: d("2026-07-15T09:30:00Z") },
      { start: d("2026-07-15T14:00:00Z"), end: d("2026-07-15T15:00:00Z") },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe("findOpenSlots", () => {
  const range = { from: d("2026-07-15T00:00:00Z"), to: d("2026-07-15T23:59:00Z") };
  const workingHours = { startHour: 9, endHour: 17 };

  it("never proposes a slot that collides with a busy block — the whole point of reading free/busy", () => {
    const slots = findOpenSlots({
      range,
      busy: [{ start: d("2026-07-15T10:00:00Z"), end: d("2026-07-15T11:00:00Z") }],
      durationMinutes: 60,
      workingHours,
      slotStepMinutes: 60,
      utcOffsetMinutes: 0,
      now: d("2026-07-15T00:00:00Z"),
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const overlapsBusy =
        slot.start.getTime() < d("2026-07-15T11:00:00Z").getTime() &&
        d("2026-07-15T10:00:00Z").getTime() < slot.end.getTime();
      expect(overlapsBusy).toBe(false);
    }
    expect(slots[0].start.toISOString()).toBe("2026-07-15T09:00:00.000Z");
  });

  it("keeps slots inside working hours (nothing before 09:00 or ending after 17:00)", () => {
    const slots = findOpenSlots({
      range,
      busy: [],
      durationMinutes: 60,
      workingHours,
      slotStepMinutes: 60,
      maxSlots: 20,
      utcOffsetMinutes: 0,
      now: d("2026-07-15T00:00:00Z"),
    });
    for (const slot of slots) {
      expect(slot.start.getUTCHours()).toBeGreaterThanOrEqual(9);
      expect(slot.end.getUTCHours() === 17 || slot.end.getUTCHours() < 17).toBe(true);
    }
  });

  it("never proposes a slot in the past — suggestions must be actionable now", () => {
    const now = d("2026-07-15T12:30:00Z");
    const slots = findOpenSlots({
      range,
      busy: [],
      durationMinutes: 60,
      workingHours,
      slotStepMinutes: 60,
      utcOffsetMinutes: 0,
      now,
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      expect(slot.start.getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it("applies working hours in the user's local timezone, not UTC", () => {
    // +330 (IST): local 09:00 == 03:30 UTC.
    const slots = findOpenSlots({
      range: { from: d("2026-07-15T00:00:00Z"), to: d("2026-07-15T20:00:00Z") },
      busy: [],
      durationMinutes: 30,
      workingHours,
      slotStepMinutes: 30,
      utcOffsetMinutes: 330,
      now: d("2026-07-15T00:00:00Z"),
    });
    expect(slots[0].start.toISOString()).toBe("2026-07-15T03:30:00.000Z");
  });
});

describe("dayLoad / isOverloaded", () => {
  const busy = [
    { start: d("2026-07-15T09:00:00Z"), end: d("2026-07-15T10:00:00Z") },
    { start: d("2026-07-15T11:00:00Z"), end: d("2026-07-15T12:00:00Z") },
    { start: d("2026-07-15T14:00:00Z"), end: d("2026-07-15T15:00:00Z") },
    { start: d("2026-07-16T09:00:00Z"), end: d("2026-07-16T10:00:00Z") },
  ];

  it("counts only the meetings that fall on the queried day", () => {
    const load = dayLoad({ day: d("2026-07-15T12:00:00Z"), busy, utcOffsetMinutes: 0 });
    expect(load.meetingCount).toBe(3);
    expect(load.busyMinutes).toBe(180);
  });

  it("flips to overloaded exactly at the threshold — the 'too many meetings' banner condition", () => {
    const day = d("2026-07-15T12:00:00Z");
    expect(isOverloaded({ day, busy, maxMeetingsPerDay: 3, utcOffsetMinutes: 0 })).toBe(true);
    expect(isOverloaded({ day, busy, maxMeetingsPerDay: 4, utcOffsetMinutes: 0 })).toBe(false);
  });
});
