import type { RecurrenceRule } from "@dhaga/core";

export type CalendarFollowUp = {
  /**
   * Discriminator for the notification bell and the calendar grid, which now
   * carry more than one kind of reminder. Only follow-ups can be marked done, so
   * the bell's inline Done button must branch on this rather than assume.
   *
   * EXTENSION POINT: a second kind (e.g. an important-date item derived from
   * ../important-dates.ts) becomes its own type with `kind: "important-date"`,
   * unioned into getNotificationSummary's `items` — no change to this type.
   */
  kind: "follow-up";
  id: string;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  associationLabel: string;
  recurrence: RecurrenceRule | null;
  action: string;
  dueDate: string | null; // ISO
  dueHint: string | null;
  /**
   * Completed work is HISTORY, not a pending item. The calendar renders done
   * rows struck through so "did I ever do that?" has an answer on the grid, but
   * every surface that means "outstanding" — the bell, the reminder email —
   * filters to `"open"` first (see ./predicates.ts `isOpenFollowUp`). Dismissed
   * rows never reach here at all: they go to status 'dismissed', which
   * `listTasks()` does not read.
   */
  status: "open" | "done";
  overdue: boolean;
};
