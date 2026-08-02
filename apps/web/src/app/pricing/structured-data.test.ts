import { describe, expect, it } from "vitest";

import { PRICING_OFFERS } from "./structured-data";

describe("pricing structured data", () => {
  it("publishes purchasable Pro cadences and the limited founding offer", () => {
    expect(PRICING_OFFERS.map((offer) => [offer.name, offer.price])).toEqual([
      ["Free", 0],
      ["Pro monthly", 10],
      ["Pro yearly", 96],
      ["Founding Pro — first year", 79],
    ]);
  });

  it("does not advertise coming-soon Power as an available offer", () => {
    expect(PRICING_OFFERS.some((offer) => offer.name.includes("Power"))).toBe(false);
  });
});
