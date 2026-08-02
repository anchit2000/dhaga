import { describe, expect, it } from "vitest";

import { priceForCadence } from "../cadence";
import { FOUNDING_PRO_OFFER, PRICING_PLANS } from "../plans";

function plan(tier: string) {
  const result = PRICING_PLANS.find((candidate) => candidate.tier === tier);
  if (!result) throw new Error(`Missing ${tier} plan`);
  return result;
}

describe("pricing cadence", () => {
  it("shows Pro yearly as $8 monthly and $24 saved", () => {
    expect(priceForCadence(plan("Pro"), "yearly")).toEqual({
      monthly: 8,
      billedTotal: 96,
      savings: 24,
    });
  });

  it("shows Power yearly as $24 monthly and $72 saved", () => {
    expect(priceForCadence(plan("Power"), "yearly")).toEqual({
      monthly: 24,
      billedTotal: 288,
      savings: 72,
    });
  });

  it("keeps monthly billing undiscounted", () => {
    expect(priceForCadence(plan("Pro"), "monthly")).toEqual({
      monthly: 10,
      billedTotal: 10,
      savings: 0,
    });
    expect(priceForCadence(plan("Power"), "monthly").monthly).toBe(30);
  });

  it("keeps founding Pro separate from standard annual pricing", () => {
    expect(FOUNDING_PRO_OFFER.standardYearlyPrice - FOUNDING_PRO_OFFER.price).toBe(
      FOUNDING_PRO_OFFER.savings,
    );
  });
});
