import type { RecurrenceRule } from "@dhaga/core";

export interface ReachOutScheduleFields {
  reachOutRecurrenceFrequency?: string | null;
  reachOutRecurrenceInterval?: number | null;
  reachOutRecurrenceWeekday?: number | null;
  reachOutRecurrenceMonthDay?: number | null;
  reachOutRecurrenceMonth?: number | null;
}

export interface CadenceSelectors {
  weekday: number | null;
  monthDay: number | null;
  month: number | null;
}

export interface CadenceFormSelection {
  days: string;
  weekday: string;
  monthDay: string;
  month: string;
}

export interface CadenceUpdateResult {
  /** False means an explicit over-capacity weekday still needs confirmation. */
  persisted: boolean;
  schedule: RecurrenceRule | null;
  warning: string | null;
}
