import { FOLLOW_UP_LONG_OPEN_DAYS } from "@/utils/constants/app";

export interface FollowUpDueBadge {
  /** Short label for the chip, e.g. "due in 3 days", "overdue 2 days". */
  label: string;
  /** Urgent items read in the accent colour; the rest stay quiet. */
  urgent: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two instants, counted on calendar-day boundaries so
 *  "tomorrow at 09:00" reads as 1 day away from "today at 18:00", not 0. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;

/**
 * The chip on a follow-up row, mirroring how the list is ordered: dated items
 * count down to (or past) their due date, undated ones report how long they
 * have been waiting — which is what puts them in oldest-first order.
 *
 * Pure and injectable-`now` so it's testable and so a server render and the
 * client hydration can't disagree about "today".
 */
export function followUpDueBadge(
  item: { dueDate: Date | null; createdAt: Date },
  now: Date,
): FollowUpDueBadge {
  if (item.dueDate) {
    const days = daysBetween(now, item.dueDate);
    if (days < 0) return { label: `overdue ${plural(-days, "day")}`, urgent: true };
    if (days === 0) return { label: "due today", urgent: true };
    if (days === 1) return { label: "due tomorrow", urgent: true };
    return { label: `due in ${plural(days, "day")}`, urgent: days <= 3 };
  }
  const open = Math.max(0, daysBetween(item.createdAt, now));
  // No date was ever set, so nothing is "late" — but one sitting here for weeks
  // is the whole reason undated items sort oldest-first, so say it plainly.
  if (open >= FOLLOW_UP_LONG_OPEN_DAYS) return { label: "due for long", urgent: true };
  if (open === 0) return { label: "added today", urgent: false };
  return { label: `open ${plural(open, "day")}`, urgent: false };
}
