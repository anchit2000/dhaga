import { addCalendarDays, calendarWeekday, parseCalendarDate } from "./calendar-day-math";
import type { CalendarDay } from "./calendar-day";

const WEEKDAYS: Readonly<Record<string, number>> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type DatePhraseResolution =
  | { kind: "exact"; date: CalendarDay }
  | {
      kind: "ambiguous";
      date: CalendarDay;
      alternatives: CalendarDay[];
      reason: "weekend";
    }
  | { kind: "unresolved" };

function namedWeekday(
  from: CalendarDay,
  target: number,
  qualifier: "next" | "this" | undefined,
): CalendarDay {
  let delta = (target - calendarWeekday(from) + 7) % 7;
  if (qualifier === "next" && delta === 0) delta = 7;
  return addCalendarDays(from, delta);
}

function weekend(from: CalendarDay, qualifier: "next" | "this" | undefined): DatePhraseResolution {
  let saturdayDelta = (6 - calendarWeekday(from) + 7) % 7;
  if (qualifier === "next" && saturdayDelta === 0) saturdayDelta = 7;
  // On Sunday the Saturday of "this" weekend is already past; choose the next
  // actionable weekend instead of scheduling retroactively.
  if (calendarWeekday(from) === 0 && qualifier !== "next") saturdayDelta = 6;
  const saturday = addCalendarDays(from, saturdayDelta);
  const sunday = addCalendarDays(saturday, 1);
  return { kind: "ambiguous", date: saturday, alternatives: [saturday, sunday], reason: "weekend" };
}

/**
 * Resolve common due-date phrases deterministically against the user's day.
 * The LLM may identify the verbatim timing hint; it never decides the date.
 */
export function resolveDatePhrase(value: string | null, from: CalendarDay): DatePhraseResolution {
  if (!value?.trim()) return { kind: "unresolved" };
  const phrase = value.trim().toLowerCase().replace(/\s+/g, " ");

  const iso = phrase.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) {
    const parsed = parseCalendarDate(iso[0]);
    return parsed ? { kind: "exact", date: parsed } : { kind: "unresolved" };
  }
  if (/\bday after tomorrow\b/.test(phrase)) {
    return { kind: "exact", date: addCalendarDays(from, 2) };
  }
  if (/\btomorrow\b/.test(phrase)) return { kind: "exact", date: addCalendarDays(from, 1) };
  if (/\btoday\b/.test(phrase)) return { kind: "exact", date: from };

  const relative = phrase.match(
    /\b(?:in\s+)?(\d+)\s+(days?|weeks?)(?:\s+from\s+(?:now|today))?\b/,
  );
  if (relative) {
    const multiplier = relative[2].startsWith("week") ? 7 : 1;
    return { kind: "exact", date: addCalendarDays(from, Number(relative[1]) * multiplier) };
  }

  const weekendMatch = phrase.match(/\b(?:(next|this)\s+)?weekend\b/);
  if (weekendMatch) return weekend(from, weekendMatch[1] as "next" | "this" | undefined);

  const weekdayMatch = phrase.match(
    /\b(?:(?:by|on)\s+)?(?:(next|this)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch) {
    const qualifier = weekdayMatch[1] as "next" | "this" | undefined;
    return { kind: "exact", date: namedWeekday(from, WEEKDAYS[weekdayMatch[2]], qualifier) };
  }
  return { kind: "unresolved" };
}
