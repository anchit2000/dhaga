import { DUE_CHECK_INS_HREF } from "@/utils/constants/home";

/**
 * Wording and routing for the cadence-due people — Home's "Today" footer and the
 * "Due for a check-in" block it hands off to.
 *
 * Pure and separate from the components so the thing that actually misled a user
 * is assertable without rendering: the footer's count comes from
 * `listDueReachOuts()`, so its link has to land on the page that lists THAT set.
 * It pointed at the unfiltered `/app/people`, where the number and the page
 * could never agree.
 */

const DAY_MS = 86_400_000;

export interface DueLink {
  href: string;
  label: string;
}

/**
 * The Today tile's footer. With people left over it hands off to the block that
 * lists them; with none left over there is no due list to hand off, so it falls
 * back to the browsable people list.
 *
 * No "this week" in the label: `listDueReachOuts` is every contact whose
 * interval has ELAPSED — a yearly cadence can be 400 days late — so a week was
 * a boundary the data never had.
 */
export function dueReachOutFooter(moreDue: number): DueLink {
  if (moreDue <= 0) return { href: "/app/people", label: "View all people" };
  return { href: DUE_CHECK_INS_HREF, label: `+${moreDue} more due` };
}

export interface DueCheckInBadge {
  /** Short label for the chip, e.g. "3 days over". */
  label: string;
  /** Only a full cadence late takes the accent colour; the rest stay quiet. */
  urgent: boolean;
}

/**
 * How late a check-in is, in whole days past the cadence. Mirrors
 * FollowUpDueChip's idiom.
 *
 * Urgency needs a whole extra cycle rather than a fixed number of days: three
 * days past a weekly rhythm is late, three days past a yearly one is noise, and
 * accenting both would make amber mean "there is a list" instead of "act now".
 */
export function dueCheckInBadge(
  lastTouch: Date,
  everyDays: number,
  now: Date,
): DueCheckInBadge {
  const elapsed = Math.floor((now.getTime() - lastTouch.getTime()) / DAY_MS);
  const over = elapsed - everyDays;
  // The SQL only yields rows past their interval, so <= 0 is a rounding edge
  // (the row came due within the last day), not a contradiction.
  if (over <= 0) return { label: "due now", urgent: everyDays <= 0 };
  return {
    label: `${over} ${over === 1 ? "day" : "days"} over`,
    urgent: everyDays > 0 && over >= everyDays,
  };
}
