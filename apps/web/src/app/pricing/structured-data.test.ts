import { describe, expect, it } from "vitest";

import { pricingOffers } from "./structured-data";

describe("pricing structured data", () => {
  it("publishes purchasable Pro cadences and the limited founding offer", () => {
    expect(pricingOffers(true, "INR").map((offer) => [offer.name, offer.price])).toEqual([
      ["Free", 0],
      ["Pro monthly", 899],
      ["Pro yearly", 8499],
      ["Founding Pro", 6999],
    ]);
  });

  it("advertises the currency the instance charges, not the one on screen", () => {
    // The /pricing toggle can render these plans in dollars, captioned as an
    // approximate conversion. A crawler never sees that caption, so publishing
    // the toggled currency would be a machine-readable false price — worse than
    // no markup. Razorpay bills in rupees today, so INR is what ships.
    for (const offer of pricingOffers(true, "INR")) {
      expect(offer.priceCurrency).toBe("INR");
    }
    // And it genuinely follows the charge rather than being hardcoded: a
    // Stripe-charging instance publishes the USD amounts for the same plans.
    expect(pricingOffers(false, "USD").map((offer) => [offer.priceCurrency, offer.price])).toEqual([
      ["USD", 0],
      ["USD", 10],
      ["USD", 96],
    ]);
  });

  it("prices the founding offer in the currency it is charged in", () => {
    // It is sold as one Razorpay plan in rupees and has no Stripe price at all,
    // so a USD figure here would advertise a price no checkout can honour —
    // even on an instance whose other plans are charged in dollars.
    const founding = pricingOffers(true, "USD").at(-1);
    expect(founding?.priceCurrency).toBe("INR");
    expect(founding?.price).toBe(6999);
    expect(founding?.availability).toBe("https://schema.org/LimitedAvailability");
  });

  it("names the founding offer without promising a first year", () => {
    // Founding members keep ₹6,999 at every renewal (BRD §11 Q6, resolved
    // 2026-08), so an offer called "first year" would contradict the product.
    const founding = pricingOffers(true, "INR").at(-1);
    expect(founding?.name).toBe("Founding Pro");
    expect(founding?.name).not.toMatch(/first year/i);
  });

  it("withholds the founding offer once the seats are gone", () => {
    // A LimitedAvailability offer that nobody can buy is a false claim to every
    // crawler that reads it — and the card on the page is withheld in exactly
    // the same case, so the markup keeps matching what a visitor sees.
    const names = pricingOffers(false, "INR").map((offer) => offer.name);
    expect(names).not.toContain("Founding Pro");
    expect(names).toEqual(["Free", "Pro monthly", "Pro yearly"]);
  });

  it("never publishes a live seat count", () => {
    // How many seats remain is admin-only now: at 500 of 500 it announces that
    // nobody has bought anything. Sell-out is still expressed, by the offer
    // disappearing entirely.
    const payload = JSON.stringify(pricingOffers(true, "INR"));
    expect(payload).not.toMatch(/seats/i);
    expect(payload).not.toMatch(/remaining/i);
  });

  it("does not advertise coming-soon Power as an available offer", () => {
    expect(pricingOffers(true, "INR").some((offer) => offer.name.includes("Power"))).toBe(false);
  });
});
