import { describe, expect, it, vi } from "vitest";
import { classifyPlanChange, planChangeOffers } from "../plan-change/decide";

/**
 * WHY THIS SUITE EXISTS: a founding member paid ₹6,999 for a year of Pro, and
 * the plan-change surface is the one place that price can be taken away from
 * them. Two distinct hazards, one for each direction:
 *
 *   - Moving a founding member ONTO standard yearly is a silent ₹1,500 rise
 *     applied "immediately, prorated". It must not be offered and must not
 *     happen if requested.
 *   - Moving anyone else onto the founding price would hand out a capped seat
 *     through a path that never counts seats.
 */
vi.mock("../repo", () => ({
  getSubscriptionForUser: async () => {
    throw new Error("changePlan read the subscription before refusing a founding target");
  },
  patchSubscriptionForUser: vi.fn(),
}));

const { changePlan } = await import("../plan-change/change");

const FOUNDING = { plan: "pro", cadence: "founding_yearly" } as const;

describe("a founding member's plan changes", () => {
  it("treats standard yearly as the SAME rung, so it is never offered", () => {
    // Not "downgrade" (which would book it for the renewal boundary) and not
    // "upgrade" (which would charge the difference today) — the tier and the
    // billing period are identical, only the price differs. Classifying it as
    // unchanged is what keeps it out of planChangeOffers entirely.
    expect(classifyPlanChange(FOUNDING, { plan: "pro", cadence: "yearly" })).toBe("unchanged");

    const available = [
      { plan: "pro", cadence: "monthly" },
      { plan: "pro", cadence: "yearly" },
      { plan: "power", cadence: "yearly" },
    ] as const;
    expect(planChangeOffers(FOUNDING, available)).toEqual([
      // Dropping to monthly is a real reduction and waits for renewal.
      { plan: "pro", cadence: "monthly", direction: "downgrade", timing: "period_end" },
      { plan: "power", cadence: "yearly", direction: "upgrade", timing: "immediate" },
    ]);
  });

  it("still lets them move up a tier immediately", () => {
    // Founding is a price, not a cage: raising the tier is money coming in and
    // must not be deferred to the renewal boundary.
    expect(classifyPlanChange(FOUNDING, { plan: "power", cadence: "monthly" })).toBe("upgrade");
  });

  it("refuses founding as a change TARGET before touching anything", async () => {
    // availableCombinations already keeps it out of the offers list; this is the
    // guard for a hand-made request. The mocked repo throws if the guard lets
    // execution reach it, so this also pins that the refusal is the first thing
    // changePlan does.
    await expect(changePlan("user-1", { plan: "pro", cadence: "founding_yearly" })).rejects.toThrow(
      /only available when you first subscribe/i,
    );
  });
});
