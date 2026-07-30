import type { ImportantDateItem } from "./feed";

/**
 * Display strings for the bell rows. Pure and separate from feed.ts so the
 * wording is unit-testable and the merge logic stays about ordering only.
 */

/**
 * Relative day for an important date. `daysUntil` is already computed against
 * the local calendar day upstream, so this does no date maths — a negative
 * value (an occurrence inside a calendar window that has just passed) still
 * reads as today rather than "in -1 days".
 */
export function importantDateWhen(daysUntil: number): string {
  if (daysUntil <= 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}

/**
 * "Birthday · turning 34" — `turning` is null when the stored value carried no
 * year, and then we say nothing rather than guess an age.
 */
export function importantDateDetail(item: ImportantDateItem): string {
  return item.turning === null ? item.label : `${item.label} · turning ${item.turning}`;
}
