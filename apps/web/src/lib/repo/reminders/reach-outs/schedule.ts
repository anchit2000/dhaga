import {
  calendarDayToUtcDate,
  daysInCalendarMonth,
  nextRecurrenceOccurrence,
  recurrenceRuleFromFields,
} from "@dhaga/core";
import { localDay } from "../local-today";
import type { CalendarDay, RecurrenceRule } from "@dhaga/core";
import type { ReachOutScheduleFields } from "@/types";

function dayValue(day: CalendarDay): number {
  return calendarDayToUtcDate(day).getTime();
}

function occurrence(year: number, month: number, requestedDay: number): CalendarDay {
  return { year, month, day: Math.min(requestedDay, daysInCalendarMonth(year, month)) };
}

function previousAnchor(last: CalendarDay, candidates: CalendarDay[]): CalendarDay {
  const lastValue = dayValue(last);
  return candidates
    .filter((candidate) => dayValue(candidate) <= lastValue)
    .sort((a, b) => dayValue(b) - dayValue(a))[0] ?? candidates[0];
}

function yearlyAnchor(last: CalendarDay, rule: RecurrenceRule): CalendarDay {
  const month = rule.month ?? last.month;
  const monthDay = rule.monthDay ?? last.day;
  return previousAnchor(last, [
    occurrence(last.year - 1, month, monthDay),
    occurrence(last.year, month, monthDay),
  ]);
}

function halfYearAnchor(last: CalendarDay, rule: RecurrenceRule): CalendarDay {
  const month = rule.month ?? last.month;
  const monthDay = rule.monthDay ?? last.day;
  const candidates: CalendarDay[] = [];
  for (const year of [last.year - 2, last.year - 1, last.year]) {
    for (const offset of [0, 6]) {
      const total = year * 12 + month - 1 + offset;
      candidates.push(occurrence(Math.floor(total / 12), (total % 12) + 1, monthDay));
    }
  }
  return previousAnchor(last, candidates);
}

export function reachOutRule(fields: ReachOutScheduleFields): RecurrenceRule | null {
  return recurrenceRuleFromFields({
    frequency: fields.reachOutRecurrenceFrequency,
    interval: fields.reachOutRecurrenceInterval,
    weekday: fields.reachOutRecurrenceWeekday,
    monthDay: fields.reachOutRecurrenceMonthDay,
    month: fields.reachOutRecurrenceMonth,
  });
}

export function nextReachOutDay(
  lastTouch: Date,
  fields: ReachOutScheduleFields,
  timeZone: string,
): CalendarDay | null {
  const rule = reachOutRule(fields);
  if (!rule) return null;
  const last = localDay(lastTouch, timeZone);
  const anchor = rule.frequency === "yearly" && rule.month !== null
    ? yearlyAnchor(last, rule)
    : rule.frequency === "monthly" && rule.interval === 6 && rule.month !== null
      ? halfYearAnchor(last, rule)
      : last;
  return nextRecurrenceOccurrence(anchor, rule);
}

export function isReachOutDue(
  everyDays: number | null,
  lastTouch: Date,
  fields: ReachOutScheduleFields = {},
  timeZone = "UTC",
  now: Date = new Date(),
): boolean {
  if (everyDays == null) return false;
  const dueDay = nextReachOutDay(lastTouch, fields, timeZone);
  if (!dueDay) return now.getTime() - lastTouch.getTime() > everyDays * 86_400_000;
  return dayValue(localDay(now, timeZone)) >= dayValue(dueDay);
}
