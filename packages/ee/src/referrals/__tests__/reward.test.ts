import { describe, expect, it } from "vitest";
import { computeExtendedExpiry } from "../reward";

/**
 * computeExtendedExpiry is the trust boundary of the comp reward: it must
 * (a) never downgrade a never-expiring plan to a dated one, (b) stack a fresh
 * month on top of a still-valid expiry, and (c) restart from now when the old
 * expiry already lapsed. A regression here silently under- or over-grants Pro.
 * `now` is injected so the assertions don't depend on the wall clock.
 */
const DAYS = 30;
const now = new Date("2026-07-24T00:00:00Z");

function daysFrom(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

describe("computeExtendedExpiry", () => {
  it("preserves null (a never-expiring lifetime/comp is not downgraded)", () => {
    expect(computeExtendedExpiry(null, now, DAYS)).toBeNull();
  });

  it("stacks the reward on a still-valid expiry: max(now, existing) + days", () => {
    const future = new Date("2026-08-10T00:00:00Z");
    expect(computeExtendedExpiry(future, now, DAYS)).toEqual(daysFrom(future, DAYS));
  });

  it("restarts from now when the existing expiry has already lapsed", () => {
    const past = new Date("2026-06-01T00:00:00Z");
    expect(computeExtendedExpiry(past, now, DAYS)).toEqual(daysFrom(now, DAYS));
  });

  it("treats an expiry exactly at now as now (no zero/negative stacking)", () => {
    expect(computeExtendedExpiry(new Date(now), now, DAYS)).toEqual(daysFrom(now, DAYS));
  });
});
