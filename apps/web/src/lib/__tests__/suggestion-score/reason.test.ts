import { describe, expect, it } from "vitest";
import { candidate, copyOf, daysAgo } from "./helpers";

/**
 * The copy contract: a row's reason is derived from the term that actually
 * ranked it. That is what stops Today from asserting something untrue about a
 * person — and the same string is emailed verbatim in the daily digest, where
 * nobody is around to notice it is wrong.
 */
describe("suggestion score — reason", () => {
  it("`starred` can never be the displayed reason", () => {
    const star = candidate({ starred: true, degree: 1, lastTouch: daysAgo(1) });
    // Starred is the biggest term on this candidate (10) — larger than degree
    // (1) and quiet (~0.1) — so it would win the label if it were eligible.
    // WHY: "you starred them" is not a reason to message someone today. It
    // explains ordering between people who already earned their place, nothing
    // more.
    expect(copyOf(star).bucket).toBe("graph");
    expect(copyOf(star).reason).toBe("1 connection in your network");
    expect(copyOf(star).reason).not.toMatch(/star/i);
  });

  it("the reason names the highest-contributing term", () => {
    const importantDate = { label: "Birthday", daysUntil: 0 };
    const veryOverdue = candidate({ everyDays: 7, lastTouch: daysAgo(14), importantDate });
    const barelyDue = candidate({ everyDays: 7, lastTouch: daysAgo(7.01), importantDate });
    // WHY: both people are cadence-due AND have a birthday today, so the copy
    // has to follow whichever term actually ranked them. A row explained by
    // something that did not put it there is a row the user cannot trust.
    expect(copyOf(veryOverdue).reason).toBe("Weekly · due to reconnect"); // cadence 40 > 30
    expect(copyOf(barelyDue).reason).toBe("Birthday today"); // date 30 > cadence 24
  });
});
