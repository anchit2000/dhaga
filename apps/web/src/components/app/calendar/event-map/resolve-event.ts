import type { CalendarFollowUp } from "@/lib/repo/reminders";

/** What the details dialog just did to a follow-up row. */
export type FollowUpOutcome = {
  kind: "done" | "dismiss";
  /** The next occurrence of a recurring row; null when nothing follows. */
  advancedTo: string | null;
};

/**
 * Reconcile the board's follow-up list after completing or dismissing a row.
 *
 * This is a PURE list transform, not an imperative poke at FullCalendar's event
 * store, because the board's `events` array is now recomputed whenever a filter
 * or the search box changes. An `event.remove()` would be silently undone by the
 * next keystroke — and an UNSCHEDULED follow-up has no grid event to remove in
 * the first place, so the tray would keep showing work that was already done.
 *
 * The three outcomes mirror what the server actually did:
 *  - dismissed → status 'dismissed', which no list reads: gone from the board.
 *  - recurring completion → still OPEN, at its next occurrence, and not overdue.
 *  - one-off completion → status 'done', which the calendar now KEEPS and renders
 *    struck through. Removing it here would hide the very history 1.4 added.
 */
export function applyFollowUpOutcome(
  items: CalendarFollowUp[],
  id: string,
  outcome: FollowUpOutcome,
): CalendarFollowUp[] {
  return items.flatMap((item) => {
    if (item.id !== id) return [item];
    if (outcome.kind === "dismiss") return [];
    if (outcome.advancedTo) {
      return [{ ...item, dueDate: outcome.advancedTo, overdue: false }];
    }
    return [{ ...item, status: "done" as const, overdue: false }];
  });
}

/**
 * Reconcile the same list after a drag lands a follow-up on a new day. A
 * rescheduled item is by definition no longer late for its old date, so the
 * amber overdue treatment has to come off with it.
 */
export function applyFollowUpDueDate(
  items: CalendarFollowUp[],
  id: string,
  dueDate: string,
): CalendarFollowUp[] {
  return items.map((item) => (item.id === id ? { ...item, dueDate, overdue: false } : item));
}
