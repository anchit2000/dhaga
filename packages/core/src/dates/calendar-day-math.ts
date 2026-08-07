import type { CalendarDay } from "./calendar-day";

const ISO_CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC is used only as a DST-free arithmetic engine; the value remains a day. */
export function calendarDayToUtcDate(day: CalendarDay): Date {
  return new Date(Date.UTC(day.year, day.month - 1, day.day));
}

/** Read the semantic calendar day from a canonical UTC date. */
export function calendarDayFromUtcDate(date: Date): CalendarDay {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function daysInCalendarMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isCalendarDay(day: CalendarDay): boolean {
  return (
    Number.isInteger(day.year) &&
    Number.isInteger(day.month) &&
    Number.isInteger(day.day) &&
    day.year >= 1 &&
    day.day >= 1 &&
    day.day <= daysInCalendarMonth(day.year, day.month)
  );
}

/** Strict YYYY-MM-DD parser. Invalid rollovers such as 2026-02-30 are rejected. */
export function parseCalendarDate(value: string): CalendarDay | null {
  const match = ISO_CALENDAR_DAY.exec(value.trim());
  if (!match) return null;
  const day = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isCalendarDay(day) ? day : null;
}

/** Add whole calendar days without inheriting the host timezone or DST. */
export function addCalendarDays(day: CalendarDay, amount: number): CalendarDay {
  const date = calendarDayToUtcDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return calendarDayFromUtcDate(date);
}

/** Sunday=0 through Saturday=6, matching JavaScript and calendar providers. */
export function calendarWeekday(day: CalendarDay): number {
  return calendarDayToUtcDate(day).getUTCDay();
}
