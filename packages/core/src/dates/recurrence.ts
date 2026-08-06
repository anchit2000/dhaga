import {
  addCalendarDays,
  calendarWeekday,
  daysInCalendarMonth,
  isCalendarDay,
} from "./calendar-day-math";
import type { CalendarDay } from "./calendar-day";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

/** Null optional selectors mean "keep the corresponding part of the current due day". */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  /** Sunday=0 through Saturday=6. Useful for weekly rules. */
  weekday: number | null;
  /** 1-31; short months clamp to their final day. */
  monthDay: number | null;
  /** 1-12; useful for yearly rules. */
  month: number | null;
}

export function isRecurrenceRule(rule: RecurrenceRule): boolean {
  return (
    RECURRENCE_FREQUENCIES.includes(rule.frequency) &&
    Number.isInteger(rule.interval) &&
    rule.interval >= 1 &&
    (rule.weekday === null || (Number.isInteger(rule.weekday) && rule.weekday >= 0 && rule.weekday <= 6)) &&
    (rule.monthDay === null ||
      (Number.isInteger(rule.monthDay) && rule.monthDay >= 1 && rule.monthDay <= 31)) &&
    (rule.month === null || (Number.isInteger(rule.month) && rule.month >= 1 && rule.month <= 12))
  );
}

/** Convert nullable database columns into one validated shared rule. */
export function recurrenceRuleFromFields(fields: {
  frequency: string | null | undefined;
  interval: number | null | undefined;
  weekday: number | null | undefined;
  monthDay: number | null | undefined;
  month: number | null | undefined;
}): RecurrenceRule | null {
  if (!fields.frequency || !RECURRENCE_FREQUENCIES.includes(fields.frequency as RecurrenceFrequency)) {
    return null;
  }
  const rule: RecurrenceRule = {
    frequency: fields.frequency as RecurrenceFrequency,
    interval: fields.interval ?? 1,
    weekday: fields.weekday ?? null,
    monthDay: fields.monthDay ?? null,
    month: fields.month ?? null,
  };
  return isRecurrenceRule(rule) ? rule : null;
}

function monthlyOccurrence(current: CalendarDay, rule: RecurrenceRule): CalendarDay {
  const totalMonth = current.year * 12 + current.month - 1 + rule.interval;
  const year = Math.floor(totalMonth / 12);
  const month = (totalMonth % 12) + 1;
  const requestedDay = rule.monthDay ?? current.day;
  return { year, month, day: Math.min(requestedDay, daysInCalendarMonth(year, month)) };
}

function yearlyOccurrence(current: CalendarDay, rule: RecurrenceRule): CalendarDay {
  const year = current.year + rule.interval;
  const month = rule.month ?? current.month;
  const requestedDay = rule.monthDay ?? current.day;
  return { year, month, day: Math.min(requestedDay, daysInCalendarMonth(year, month)) };
}

/** The first recurrence strictly after the current occurrence. */
export function nextRecurrenceOccurrence(
  current: CalendarDay,
  rule: RecurrenceRule,
): CalendarDay | null {
  if (!isCalendarDay(current) || !isRecurrenceRule(rule)) return null;
  if (rule.frequency === "daily") return addCalendarDays(current, rule.interval);
  if (rule.frequency === "monthly") return monthlyOccurrence(current, rule);
  if (rule.frequency === "yearly") return yearlyOccurrence(current, rule);

  if (rule.weekday === null) return addCalendarDays(current, rule.interval * 7);
  let delta = (rule.weekday - calendarWeekday(current) + 7) % 7;
  if (delta === 0) delta = 7;
  return addCalendarDays(current, delta + (rule.interval - 1) * 7);
}
