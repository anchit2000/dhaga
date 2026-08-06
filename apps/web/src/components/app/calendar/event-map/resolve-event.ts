import type { EventApi } from "@fullcalendar/core";

type ResolvableEvent = Pick<EventApi, "remove" | "setExtendedProp" | "setStart">;

/** Reconcile FullCalendar's imperative event after completing/dismissing a row.
 * A recurring row remains open at its next occurrence; every terminal result
 * disappears. The ISO value stays in extendedProps for the next concurrency
 * guard, while the date-only start avoids timezone-shifting an all-day event. */
export function reconcileResolvedFollowUpEvent(
  event: ResolvableEvent | null,
  advancedTo: string | null,
): void {
  if (!event) return;
  if (!advancedTo) {
    event.remove();
    return;
  }
  event.setStart(advancedTo.slice(0, 10));
  event.setExtendedProp("dueDate", advancedTo);
}
