import type { BusyInterval, TimeRange } from "./types";

/**
 * Pure scheduling math over free/busy data. No I/O, no clock reads except the
 * explicit `now` parameter (default injected once at the entry point) so every
 * function is deterministic and unit-testable (CLAUDE.md Rule 5, Rule 9).
 *
 * All Dates are absolute instants. `utcOffsetMinutes` is the user's offset from
 * UTC (IST = +330, PST = -480): local wall-clock = UTC + offset. Working hours
 * and day boundaries are evaluated in that local frame.
 */

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

export interface OpenSlot {
  start: Date;
  end: Date;
}

export interface WorkingHours {
  startHour: number;
  endHour: number;
}

export interface DayLoad {
  meetingCount: number;
  busyMinutes: number;
}

/** Absolute instant of the local midnight at or before `absMs`. */
function localMidnight(absMs: number, offsetMs: number): number {
  const local = new Date(absMs + offsetMs);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMs;
}

/** [a,b) overlaps [c,d) iff a < d && c < b. */
function overlaps(a: number, b: number, c: number, d: number): boolean {
  return a < d && c < b;
}

/** Sort by start and coalesce overlapping/adjacent intervals into a minimal set. */
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = [...intervals]
    .map((i) => ({ start: i.start.getTime(), end: i.end.getTime() }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged.map((i) => ({ start: new Date(i.start), end: new Date(i.end) }));
}

/**
 * Open slots of `durationMinutes` within working hours on each local day of
 * `range`, skipping any that collide with `busy` or start before `now`.
 * Chronological, capped at `maxSlots`.
 */
export function findOpenSlots(params: {
  range: TimeRange;
  busy: BusyInterval[];
  durationMinutes: number;
  workingHours: WorkingHours;
  slotStepMinutes?: number;
  maxSlots?: number;
  utcOffsetMinutes?: number;
  now?: Date;
}): OpenSlot[] {
  const offsetMs = (params.utcOffsetMinutes ?? 0) * MINUTE_MS;
  const stepMs = (params.slotStepMinutes ?? 30) * MINUTE_MS;
  const durationMs = params.durationMinutes * MINUTE_MS;
  const maxSlots = params.maxSlots ?? 6;
  const nowMs = (params.now ?? new Date()).getTime();
  const merged = mergeBusy(params.busy).map((b) => ({ s: b.start.getTime(), e: b.end.getTime() }));
  const rangeStart = Math.max(params.range.from.getTime(), nowMs);
  const rangeEnd = params.range.to.getTime();
  const slots: OpenSlot[] = [];

  for (let midnight = localMidnight(rangeStart, offsetMs); midnight <= rangeEnd; midnight += DAY_MS) {
    const workStart = midnight + params.workingHours.startHour * HOUR_MS;
    const workEnd = midnight + params.workingHours.endHour * HOUR_MS;
    for (let start = workStart; start + durationMs <= workEnd; start += stepMs) {
      if (start < rangeStart) continue;
      if (start + durationMs > rangeEnd) break;
      const end = start + durationMs;
      if (merged.some((b) => overlaps(start, end, b.s, b.e))) continue;
      slots.push({ start: new Date(start), end: new Date(end) });
      if (slots.length >= maxSlots) return slots;
    }
  }
  return slots;
}

/** Meetings intersecting the local day of `day`, and total (de-duplicated) busy minutes. */
export function dayLoad(params: {
  day: Date;
  busy: BusyInterval[];
  utcOffsetMinutes?: number;
}): DayLoad {
  const offsetMs = (params.utcOffsetMinutes ?? 0) * MINUTE_MS;
  const dayStart = localMidnight(params.day.getTime(), offsetMs);
  const dayEnd = dayStart + DAY_MS;
  const meetingCount = params.busy.filter((b) =>
    overlaps(b.start.getTime(), b.end.getTime(), dayStart, dayEnd),
  ).length;
  const busyMs = mergeBusy(params.busy).reduce((sum, b) => {
    const overlap = Math.min(b.end.getTime(), dayEnd) - Math.max(b.start.getTime(), dayStart);
    return sum + Math.max(0, overlap);
  }, 0);
  return { meetingCount, busyMinutes: Math.round(busyMs / MINUTE_MS) };
}

/** True when the local day already holds `maxMeetingsPerDay` or more meetings. */
export function isOverloaded(params: {
  day: Date;
  busy: BusyInterval[];
  maxMeetingsPerDay: number;
  utcOffsetMinutes?: number;
}): boolean {
  return (
    dayLoad({ day: params.day, busy: params.busy, utcOffsetMinutes: params.utcOffsetMinutes })
      .meetingCount >= params.maxMeetingsPerDay
  );
}
