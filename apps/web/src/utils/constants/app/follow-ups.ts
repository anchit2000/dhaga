/**
 * How long an undated follow-up sits before its chip reads "due for long".
 * Undated items are ordered oldest-first, so this is the point where age is
 * the message rather than a detail.
 */
export const FOLLOW_UP_LONG_OPEN_DAYS = 14;

/** Keep-in-touch cadence choices (docs/ideas.md #2). */
export const CADENCE_OPTIONS = [
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Fortnightly", days: 15 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Twice a year", days: 180 },
  { label: "Yearly", days: 365 },
] as const;
