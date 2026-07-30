/**
 * Wording for the "Upcoming dates" block on the follow-ups page.
 *
 * Pure and separate from the component so the boundaries that actually mislead
 * a user — "today" on the morning of the day, "turns 34" vs "34 years", the
 * lead-window label at its 0-day minimum — are testable without rendering.
 *
 * Reads off `UpcomingImportantDate.daysUntil`, which the repo already computed
 * against local calendar days; never re-derive it from the `date` string via
 * `new Date(...).toISOString()`, which lands a birthday a day early.
 */

export interface UpcomingDateBadge {
  /** Short label for the chip, e.g. "today", "in 3 days". */
  label: string;
  /** Only imminent dates take the accent colour; the rest stay quiet. */
  urgent: boolean;
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * The chip on an upcoming-date row, mirroring FollowUpDueChip's idiom minus the
 * "due" prefix — a birthday is not owed, it just arrives.
 *
 * Urgency stops at tomorrow, unlike a follow-up's 3 days: the window can be set
 * up to 90 days ahead, and accenting every row in it would make amber mean
 * "there is a list" instead of "act now".
 */
export function upcomingDateBadge(daysUntil: number): UpcomingDateBadge {
  // <= 0 rather than === 0: listUpcomingImportantDates only yields future
  // occurrences, so a negative can't reach here, but "in -1 days" would be a
  // worse failure than saying today.
  if (daysUntil <= 0) return { label: "today", urgent: true };
  if (daysUntil === 1) return { label: "tomorrow", urgent: true };
  return { label: `in ${plural(daysUntil, "day")}`, urgent: false };
}

/**
 * "turns 34" for a birthday, "12 years" for anything else — you don't turn an
 * anniversary. Null when the stored value carried no year (common for imported
 * birthdays) so the row reads a bare "Birthday" rather than "turns 0"; a
 * non-positive count is the same non-answer, from a year that is this year or
 * later.
 */
export function upcomingDateYearsPhrase(label: string, turning: number | null): string | null {
  if (turning === null || turning <= 0) return null;
  return /birthday/i.test(label) ? `turns ${turning}` : plural(turning, "year");
}

/**
 * How far ahead the block looks, so a date just outside the window reads as a
 * setting rather than a bug. Handles the 0-day minimum, where "next 0 days"
 * would be nonsense.
 */
export function upcomingDateWindowLabel(leadDays: number): string {
  if (leadDays <= 0) return "today only";
  return `next ${plural(leadDays, "day")}`;
}
