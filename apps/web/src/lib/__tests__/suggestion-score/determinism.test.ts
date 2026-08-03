import { describe, expect, it, vi } from "vitest";
import { compareScored } from "@/lib/repo/daily-suggestions";
import { candidate, daysAgo, scored, DAY_INDEX, TODAY } from "./helpers";

/**
 * Today must be the SAME list all day. The scorer takes the user's local
 * midnight and a day index as parameters rather than reading a clock, and the
 * rotation modifier is keyed off that day index — this file pins both halves:
 * nothing moves within a day, and something does move between days.
 */
describe("suggestion score — determinism", () => {
  it("two instants six hours apart inside the same local day produce an identical score and order", () => {
    const people = [
      candidate({ contactId: "hub-hari", degree: 3, lastTouch: daysAgo(30) }),
      candidate({ contactId: "due-dora", everyDays: 7, lastTouch: daysAgo(20) }),
    ];
    const rank = (): [string, number][] =>
      people
        .map((person) => scored(person))
        .sort(compareScored)
        .map((item) => [item.candidate.contactId, item.score]);

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(TODAY + 3 * 3_600_000));
      const morning = rank();
      vi.setSystemTime(new Date(TODAY + 9 * 3_600_000));
      // WHY: if the score reads the wall clock instead of the midnight it is
      // handed, decay creeps through the day and Today reshuffles under the user
      // mid-session — rows move while they are working the list.
      expect(rank()).toEqual(morning);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rotation changes filler order across days but never lifts filler above a due cadence", () => {
    const fillers = ["filler-anaya", "filler-bharat"].map((contactId) =>
      candidate({ contactId, degree: 4, lastTouch: daysAgo(30) }),
    );
    const due = candidate({ contactId: "due-dora", everyDays: 7, lastTouch: daysAgo(8) });
    const orders = new Set<string>();
    // A four-month window, not a week: the jitter drifts slowly rather than
    // resampling per day (these two fillers first swap on day 31), so a short
    // window would assert a rotation that has not happened yet. See the
    // FNV-keying note reported alongside these specs.
    for (let day = DAY_INDEX; day < DAY_INDEX + 120; day++) {
      const ranked = [...fillers, due].map((item) => scored(item, day)).sort(compareScored);
      // WHY (upper bound): rotation is a 5-point nudge, the smallest term there
      // is. It must never promote a graph filler over someone actually due.
      expect(ranked[0].candidate.contactId).toBe("due-dora");
      orders.add(ranked.slice(1).map((item) => item.candidate.contactId).join(">"));
    }
    // WHY (lower bound): it still has to DO something. Two otherwise identical
    // fillers frozen in the same order every morning is the staleness rotation
    // was added to prevent.
    expect(orders.size).toBe(2);
  });
});
