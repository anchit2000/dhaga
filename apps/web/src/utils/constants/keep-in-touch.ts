import type { RecurrenceFrequency } from "@dhaga/core";

export const CADENCE_RECURRENCE: Record<
  number,
  { frequency: RecurrenceFrequency; interval: number }
> = {
  1: { frequency: "daily", interval: 1 },
  7: { frequency: "weekly", interval: 1 },
  15: { frequency: "weekly", interval: 2 },
  30: { frequency: "monthly", interval: 1 },
  90: { frequency: "monthly", interval: 3 },
  180: { frequency: "monthly", interval: 6 },
  365: { frequency: "yearly", interval: 1 },
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

export const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

/** A fixed Sunday; only getUTCDay() is observed after core spreads the week. */
export const AUTO_ASSIGNMENT_WEEK_START = new Date(Date.UTC(2024, 0, 7));
