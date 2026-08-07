import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { spreadAcrossWeek } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { getDailySuggestionCount } from "@/lib/repo/suggestion-settings";
import {
  AUTO_ASSIGNMENT_WEEK_START,
  WEEKDAY_OPTIONS,
} from "@/utils/constants/keep-in-touch";

export async function weekdayLoads(excludeContactId: string): Promise<number[]> {
  const db = await getDb();
  const rows = await db
    .select({
      weekday: contacts.reachOutRecurrenceWeekday,
      count: sql<number>`count(*)::int`,
    })
    .from(contacts)
    .where(and(
      isNotNull(contacts.reachOutEveryDays),
      eq(contacts.reachOutRecurrenceFrequency, "weekly"),
      isNotNull(contacts.reachOutRecurrenceWeekday),
      ne(contacts.id, excludeContactId),
    ))
    .groupBy(contacts.reachOutRecurrenceWeekday);
  const loads = Array.from({ length: 7 }, () => 0);
  for (const row of rows) {
    if (row.weekday !== null && row.weekday >= 0 && row.weekday <= 6) {
      loads[row.weekday] = Number(row.count);
    }
  }
  return loads;
}

export function autoAssignedWeekday(
  contactId: string,
  loads: number[],
  perDay: number,
): number {
  const ceiling = Math.max(perDay, ...loads) + 1;
  const result = spreadAcrossWeek({
    items: [{ id: contactId, item: contactId }],
    weekStart: AUTO_ASSIGNMENT_WEEK_START,
    perDay: ceiling,
    dayCapacities: Array.from({ length: 7 }, (_, day) => ceiling - (loads[day] ?? 0)),
  });
  const bucket = result.days.find((day) => day.items.length > 0);
  return bucket?.day.getUTCDay() ?? 0;
}

export function weekdayCapacityWarning(
  weekday: number,
  existing: number,
  perDay: number,
): string | null {
  if (existing + 1 <= perDay) return null;
  const label = WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? "that day";
  return `You now have ${existing + 1} people scheduled for ${label}, above your People/day setting of ${perDay}.`;
}

/** Re-derive the warning after navigation/refresh; no transient UI-only truth. */
export async function currentWeekdayWarning(
  contactId: string,
  weekday: number,
): Promise<string | null> {
  const loads = await weekdayLoads(contactId);
  const perDay = await getDailySuggestionCount();
  return weekdayCapacityWarning(weekday, loads[weekday] ?? 0, perDay);
}
