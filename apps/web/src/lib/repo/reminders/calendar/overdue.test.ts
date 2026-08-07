import { describe, expect, it } from "vitest";
import { isOpenFollowUp, isOverdue } from "./predicates";
import type { CalendarFollowUp } from "./types";

/**
 * The calendar now loads DONE follow-ups as well as open ones (it reads
 * `listTasks()`, not `listAllOpenFollowUps()`). That widening has exactly two
 * ways to leak, and both are what these cases hold shut:
 *
 *  1. `overdue` is what paints a chip amber and what the bell counts as late.
 *     Work that is finished cannot be late, whatever its due date says.
 *  2. The bell badge and the reminder email mean "still to do". They narrow with
 *     `isOpenFollowUp` before anything else, so widening what the CALENDAR reads
 *     must not widen either of them — nobody should be emailed a reminder to do
 *     something they already did.
 */

const NOW = new Date("2026-07-31T04:00:00Z");
const UTC = "UTC";
/** Two days before NOW in UTC — unambiguously past. */
const LAST_WEEK = "2026-07-29T12:00:00Z";

describe("isOverdue", () => {
  it("marks an OPEN follow-up with a past due date as late", () => {
    expect(isOverdue({ status: "open", dueDate: LAST_WEEK }, NOW, UTC)).toBe(true);
  });

  it("never marks a DONE follow-up late, however far past its due date", () => {
    // Same row, same date, one difference: it was done. An amber "overdue" chip
    // here tells the user they missed something they completed.
    expect(isOverdue({ status: "done", dueDate: LAST_WEEK }, NOW, UTC)).toBe(false);
  });

  it("never marks an UNDATED follow-up late — it waits in the tray instead", () => {
    expect(isOverdue({ status: "open", dueDate: null }, NOW, UTC)).toBe(false);
  });
});

describe("isOpenFollowUp", () => {
  const row = (status: "open" | "done"): CalendarFollowUp => ({
    kind: "follow-up",
    id: `fu-${status}`,
    contactId: null,
    contactName: null,
    companyId: null,
    companyName: null,
    associationLabel: "Personal task",
    recurrence: null,
    action: "Send the deck",
    dueDate: LAST_WEEK,
    dueHint: null,
    status,
    overdue: status === "open",
  });

  it("keeps the bell's and the email's set to OUTSTANDING work only", () => {
    expect([row("open"), row("done")].filter(isOpenFollowUp).map((f) => f.id)).toEqual(["fu-open"]);
  });
});
