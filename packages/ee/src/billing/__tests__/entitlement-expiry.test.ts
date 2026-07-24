import { describe, expect, it } from "vitest";
import { isUnlimitedAiSub } from "../index";
import type { SubscriptionRow } from "../../db/schema";

/**
 * Expiry is the whole point of an admin-set `currentPeriodEnd`: a comped paid
 * plan must actually lapse when its expiry passes, or an admin can never
 * time-box access. These tests fail if the expiry check regresses (e.g. an
 * expired sub silently keeps unlimited AI) or if the status/plan gates are
 * loosened. `now` is injected so the assertions don't depend on wall-clock.
 */
function subRow(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: "sub_1",
    userId: "user_1",
    stripeCustomerId: "admin-granted:user_1",
    stripeSubscriptionId: null,
    plan: "pro",
    status: "active",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const now = new Date("2026-07-24T00:00:00Z");

describe("isUnlimitedAiSub", () => {
  it("grants unlimited AI for an active paid plan with no expiry", () => {
    expect(isUnlimitedAiSub(subRow({ currentPeriodEnd: null }), now)).toBe(true);
    expect(isUnlimitedAiSub(subRow({ plan: "lifetime", currentPeriodEnd: null }), now)).toBe(true);
  });

  it("grants unlimited AI when the expiry is in the future", () => {
    const future = new Date("2026-08-01T00:00:00Z");
    expect(isUnlimitedAiSub(subRow({ currentPeriodEnd: future }), now)).toBe(true);
  });

  it("revokes unlimited AI once the expiry has passed", () => {
    const past = new Date("2026-07-01T00:00:00Z");
    expect(isUnlimitedAiSub(subRow({ currentPeriodEnd: past }), now)).toBe(false);
  });

  it("never grants unlimited AI for a non-active or non-paid subscription", () => {
    expect(isUnlimitedAiSub(subRow({ status: "canceled" }), now)).toBe(false);
    expect(isUnlimitedAiSub(subRow({ status: "past_due" }), now)).toBe(false);
    expect(isUnlimitedAiSub(subRow({ plan: "free" as SubscriptionRow["plan"] }), now)).toBe(false);
    expect(isUnlimitedAiSub(null, now)).toBe(false);
  });
});
