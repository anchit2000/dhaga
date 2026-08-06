import { describe, expect, it } from "vitest";
import { applyFollowUpDueDate, applyFollowUpOutcome } from "../event-map";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * Completing, dismissing and rescheduling used to be poked straight into
 * FullCalendar's event store. Two things broke that, and both are user-visible:
 *
 *  1. The board's event array is now DERIVED from a filtered list, so anything
 *     done imperatively is undone by the next keystroke in the search box — the
 *     follow-up you just completed would reappear.
 *  2. An UNSCHEDULED follow-up has no grid event at all. Marking one done left
 *     the chip sitting in the Unscheduled tray as if nothing had happened.
 *
 * So these are list transforms, and what they encode is what the SERVER did to
 * each row — not what looks tidy on screen.
 */
function item(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "fu-1",
    contactId: "c-1",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: "2026-08-03T00:00:00.000Z",
    dueHint: null,
    status: "open",
    overdue: true,
    ...over,
  };
}

describe("applyFollowUpOutcome", () => {
  it("KEEPS a completed one-off, as the done row the calendar now renders", () => {
    // The whole point of showing done work: dropping it here would restore the
    // old behaviour where a month you had worked through looked untouched.
    const [row] = applyFollowUpOutcome([item()], "fu-1", { kind: "done", advancedTo: null });
    expect(row.status).toBe("done");
    // And it stops being late the moment it is done — an amber "overdue" chip on
    // finished work accuses the user of missing something they did.
    expect(row.overdue).toBe(false);
  });

  it("REMOVES a dismissed follow-up, because the server retired the row", () => {
    // dismissFollowUpAction sets status 'dismissed', which listTasks() does not
    // read — so it is gone everywhere, not merely struck through.
    expect(applyFollowUpOutcome([item()], "fu-1", { kind: "dismiss", advancedTo: null })).toEqual(
      [],
    );
  });

  it("keeps a recurring row OPEN at its next occurrence", () => {
    const next = "2026-08-14T00:00:00.000Z";
    const [row] = applyFollowUpOutcome([item()], "fu-1", { kind: "done", advancedTo: next });
    expect(row.status).toBe("open");
    expect(row.dueDate).toBe(next);
    expect(row.overdue).toBe(false);
  });

  it("resolves an UNSCHEDULED item too, so the tray chip disappears with it", () => {
    // The tray is derived from dueDate === null, so a dismissed undated row must
    // leave the list — there is no grid event to remove instead.
    const undated = item({ dueDate: null, overdue: false });
    expect(applyFollowUpOutcome([undated], "fu-1", { kind: "dismiss", advancedTo: null })).toEqual(
      [],
    );
  });

  it("leaves every other row untouched", () => {
    const others = [item(), item({ id: "fu-2" })];
    const after = applyFollowUpOutcome(others, "fu-1", { kind: "dismiss", advancedTo: null });
    expect(after.map((r) => r.id)).toEqual(["fu-2"]);
  });
});

describe("applyFollowUpDueDate", () => {
  it("moves a dragged follow-up and clears overdue with it", () => {
    // Dropping a late item on a future day must not leave it painted amber.
    const [row] = applyFollowUpDueDate([item()], "fu-1", "2026-09-01");
    expect(row.dueDate).toBe("2026-09-01");
    expect(row.overdue).toBe(false);
  });

  it("schedules an item out of the Unscheduled tray", () => {
    // dueDate !== null is exactly what takes a chip out of the tray.
    const [row] = applyFollowUpDueDate([item({ dueDate: null })], "fu-1", "2026-09-01");
    expect(row.dueDate).toBe("2026-09-01");
  });
});
