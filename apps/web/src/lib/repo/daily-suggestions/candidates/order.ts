import type { DueReachOut, OpenFollowUpItem } from "@/lib/repo/reminders";

/**
 * Pure list transforms applied to a source BEFORE it is folded into the
 * candidate map — each decides which rows of that source are even eligible, and
 * in what order the per-source cap sees them. Split out of ./index.ts per the
 * 150-line rule; no behaviour change.
 */

const DAY_MS = 86_400_000;

/**
 * Most-overdue-FIRST, which is not the oldest-touch-first order listDueReachOuts
 * returns (its own docblock names this: a yearly contact 400 days late has a
 * ratio of 0.09, a weekly one 8 days late has 1.14). Capping the unsorted list
 * would drop exactly the people the cadence term exists to surface.
 */
export function byOverdueRatio(due: DueReachOut[], todayMs: number): DueReachOut[] {
  const ratio = (item: DueReachOut): number =>
    item.everyDays > 0 ? (todayMs - item.lastTouch.getTime()) / DAY_MS / item.everyDays : 0;
  return [...due].sort((a, b) => ratio(b) - ratio(a) || a.id.localeCompare(b.id));
}

/** Only follow-ups DATED on or before the end of the user's today: an undated
 *  one is waiting, not due, and says nothing about today in particular. */
export function dueByEndOfToday(followUps: OpenFollowUpItem[], todayMs: number): OpenFollowUpItem[] {
  const endOfDay = todayMs + DAY_MS;
  return followUps.filter((item) => item.dueDate !== null && item.dueDate.getTime() < endOfDay);
}
