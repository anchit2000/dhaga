import { describe, expect, it } from "vitest";

import { priceForCadence } from "../cadence";
import { FOUNDING_PRO_OFFER, PRICING_PLANS } from "../plans";
import { PRICES } from "@/utils/constants/pricing";

function plan(tier: string) {
  const result = PRICING_PLANS.find((candidate) => candidate.tier === tier);
  if (!result) throw new Error(`Missing ${tier} plan`);
  return result;
}

describe("pricing cadence", () => {
  it("shows Pro yearly as $8 monthly and $24 saved", () => {
    expect(priceForCadence(plan("Pro"), "yearly", "USD")).toEqual({
      monthly: 8,
      billedTotal: 96,
      savings: 24,
    });
  });

  it("shows Power yearly as $24 monthly and $72 saved", () => {
    expect(priceForCadence(plan("Power"), "yearly", "USD")).toEqual({
      monthly: 24,
      billedTotal: 288,
      savings: 72,
    });
  });

  it("keeps monthly billing undiscounted", () => {
    expect(priceForCadence(plan("Pro"), "monthly", "USD")).toEqual({
      monthly: 10,
      billedTotal: 10,
      savings: 0,
    });
    expect(priceForCadence(plan("Power"), "monthly", "USD").monthly).toBe(30);
  });

  it("quotes the same plan in rupees when the page is showing INR", () => {
    // The /pricing currency toggle switches DISPLAY only, so both currencies
    // have to come out of the same PRICES table the checkout is kept in step
    // with. A card that could render a number from anywhere else is how a
    // visitor gets quoted one price and charged another.
    expect(priceForCadence(plan("Pro"), "yearly", "INR")).toEqual({
      monthly: 708,
      billedTotal: 8499,
      savings: 899 * 12 - 8499,
    });
    expect(priceForCadence(plan("Pro"), "monthly", "INR").monthly).toBe(899);
  });

  it("reads every amount from PRICES rather than from the plan card", () => {
    // The cards used to restate the USD figures as fields on PRICING_PLANS,
    // which meant two places to change a price and one of them silently wrong.
    // If this ever fails, someone has reintroduced the second source.
    for (const currency of ["USD", "INR"] as const) {
      for (const tier of ["Pro", "Power"] as const) {
        const card = plan(tier);
        if (!card.priceTier) throw new Error(`${tier} must name a PRICES row`);
        expect(priceForCadence(card, "monthly", currency).monthly).toBe(
          PRICES[currency][card.priceTier].monthly.amount,
        );
      }
    }
  });

  it("prices Free at zero in every currency", () => {
    expect(plan("Free").priceTier).toBeUndefined();
    expect(priceForCadence(plan("Free"), "yearly", "INR")).toEqual({
      monthly: 0,
      billedTotal: 0,
      savings: 0,
    });
  });

  it("prices founding Pro in the currency it is actually charged in", () => {
    // It is one Razorpay plan, ₹6,999 against ₹8,499, and there is no Stripe
    // price for it — see packages/ee/src/billing/catalog. A dollar figure here
    // would be a price the checkout cannot honour, which is how this constant
    // sat on the page for months advertising $79 that nothing could sell.
    expect(FOUNDING_PRO_OFFER.currency).toBe("INR");
    expect(FOUNDING_PRO_OFFER.price).toBe(6999);
    expect(FOUNDING_PRO_OFFER.standardYearlyPrice).toBe(8499);
  });

  it("keeps founding Pro separate from standard annual pricing", () => {
    expect(FOUNDING_PRO_OFFER.standardYearlyPrice - FOUNDING_PRO_OFFER.price).toBe(
      FOUNDING_PRO_OFFER.savings,
    );
  });

  it("does not carry a seat count — availability is server state", () => {
    // The number of seats LEFT comes from the billing gate, which counts
    // claimed rows against packages/ee's FOUNDING_SEAT_CAP. A constant here
    // would keep promising "500 seats" long after the 500th was taken — and
    // since 2026-08 the remaining count is not public at all: only the cap is
    // quoted, and the claimed total is admin-only (/app/admin).
    expect(FOUNDING_PRO_OFFER).not.toHaveProperty("seats");
    expect(FOUNDING_PRO_OFFER).not.toHaveProperty("seatsRemaining");
  });
});
