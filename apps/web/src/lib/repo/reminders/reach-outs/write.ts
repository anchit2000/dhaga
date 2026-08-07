import { eq } from "drizzle-orm";
import { recurrenceRuleFromFields } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { getDailySuggestionCount } from "@/lib/repo/suggestion-settings";
import { CADENCE_RECURRENCE } from "@/utils/constants/keep-in-touch";
import { autoAssignedWeekday, weekdayCapacityWarning, weekdayLoads } from "./capacity";
import type { CadenceSelectors, CadenceUpdateResult } from "@/types";

const EMPTY_SCHEDULE = {
  reachOutRecurrenceFrequency: null,
  reachOutRecurrenceInterval: null,
  reachOutRecurrenceWeekday: null,
  reachOutRecurrenceMonthDay: null,
  reachOutRecurrenceMonth: null,
} as const;

export async function setCadence(
  contactId: string,
  days: number | null,
  selectors?: CadenceSelectors,
  confirmOverCapacity = false,
): Promise<CadenceUpdateResult> {
  const db = await getDb();
  const config = days === null ? null : CADENCE_RECURRENCE[days];
  if (!config || !selectors) {
    await db.update(contacts).set({ reachOutEveryDays: days, ...EMPTY_SCHEDULE }).where(eq(contacts.id, contactId));
    return { persisted: true, schedule: null, warning: null };
  }

  let weekday = config.frequency === "weekly" ? selectors.weekday : null;
  const monthDay = config.frequency === "monthly" || config.frequency === "yearly"
    ? selectors.monthDay
    : null;
  const month = config.frequency === "yearly" || config.interval === 6
    ? selectors.month
    : null;
  let warning: string | null = null;
  if (config.frequency === "weekly") {
    const loads = await weekdayLoads(contactId);
    const perDay = await getDailySuggestionCount();
    weekday ??= autoAssignedWeekday(contactId, loads, perDay);
    warning = weekdayCapacityWarning(weekday, loads[weekday] ?? 0, perDay);
  }
  const schedule = recurrenceRuleFromFields({
    ...config,
    weekday,
    monthDay,
    month,
  });
  if (!schedule) throw new Error("Invalid keep-in-touch schedule");
  const needsConfirmation = selectors.weekday !== null && warning !== null && !confirmOverCapacity;
  if (needsConfirmation) return { persisted: false, schedule, warning };
  await db.update(contacts).set({
    reachOutEveryDays: days,
    reachOutRecurrenceFrequency: schedule.frequency,
    reachOutRecurrenceInterval: schedule.interval,
    reachOutRecurrenceWeekday: schedule.weekday,
    reachOutRecurrenceMonthDay: schedule.monthDay,
    reachOutRecurrenceMonth: schedule.month,
  }).where(eq(contacts.id, contactId));
  return { persisted: true, schedule, warning };
}
