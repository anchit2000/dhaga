import type { RecurrenceFrequency } from "@dhaga/core";

export const TASK_FILTERS = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "people", label: "People" },
  { value: "companies", label: "Companies" },
] as const;

export type TaskFilter = (typeof TASK_FILTERS)[number]["value"];

export const TASK_STATUS_FILTERS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number]["value"];

export const RECURRENCE_OPTIONS: readonly {
  value: RecurrenceFrequency;
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const RECURRENCE_UNIT_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
