import { describe, expect, it } from "vitest";
import { dueReminderOffsets } from "@/lib/jobs/linkedin-export-reminders";

/**
 * "Did your LinkedIn export arrive?" cadence (constants/linkedin.ts): nudge on
 * days +1, +3, +6, +7 after the export is requested, once each, then stop. This
 * helper is the sole decider of which nudges fire on a given day, so these cases
 * pin the [1,3,6,7]-then-stop rule itself — they must break if the schedule or
 * its stopping point ever changes (not merely if the filter logic wobbles). The
 * daily cron sends ONE email per run for whatever comes back non-empty, marks
 * every returned offset sent, and ends the sequence once day 7 has gone out.
 */
describe("dueReminderOffsets", () => {
  it("sends nothing on day 0 — LinkedIn's archive hasn't even had a day to arrive", () => {
    expect(dueReminderOffsets(0, [])).toEqual([]);
  });

  it("fires the first nudge on day 1, as the archive should be landing", () => {
    expect(dueReminderOffsets(1, [])).toEqual([1]);
  });

  it("fires the day-3 nudge once day 1 has already been sent", () => {
    expect(dueReminderOffsets(3, [1])).toEqual([3]);
  });

  it("fires the day-6 nudge once days 1 and 3 have been sent", () => {
    expect(dueReminderOffsets(6, [1, 3])).toEqual([6]);
  });

  it("fires the final day-7 nudge once days 1, 3, and 6 have been sent", () => {
    expect(dueReminderOffsets(7, [1, 3, 6])).toEqual([7]);
  });

  it("has nothing left once all four nudges are sent — the cadence is complete", () => {
    expect(dueReminderOffsets(7, [1, 3, 6, 7])).toEqual([]);
  });

  it("backfills every missed offset when a cron run was skipped, so the job can dedupe to one send", () => {
    // Cron didn't run on days 1 and 3; by day 6 all three past offsets are due
    // at once. The job sends a single email and marks all three sent — so a
    // missed run never later erupts into a burst of nudges.
    expect(dueReminderOffsets(6, [])).toEqual([1, 3, 6]);
  });
});
