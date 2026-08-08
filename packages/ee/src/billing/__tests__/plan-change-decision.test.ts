import { describe, expect, it } from "vitest";
import {
  canChangeRazorpayPlan,
  classifyPlanChange,
  planChangeOffers,
  planChangeTiming,
} from "../plan-change/decide";

/**
 * WHY THIS SUITE EXISTS: these functions decide whether a real customer is
 * charged today or refunded. Misreading an upgrade as a downgrade makes them
 * pay for the tier they just left for another whole period; misreading a
 * downgrade as an upgrade applies it mid-cycle and leaves us owing a prorated
 * refund on money already recognised. Pure, so all of that is provable without
 * Stripe, Razorpay or a database.
 */
describe("classifyPlanChange", () => {
  it("treats a tier rise as an upgrade whatever the cadence does", () => {
    // pro/yearly → power/monthly shortens the commitment but raises the tier.
    // Tier has to win: the customer is asking for more product now, and making
    // them wait a year for it is the wrong answer to a request to pay us more.
    expect(
      classifyPlanChange({ plan: "pro", cadence: "yearly" }, { plan: "power", cadence: "monthly" }),
    ).toBe("upgrade");
  });

  it("treats a tier drop as a downgrade even when the cadence lengthens", () => {
    // power/monthly → pro/yearly. If cadence were allowed to outvote tier this
    // would read as an upgrade, apply immediately, and hand back a prorated
    // credit for a Power month the customer already used.
    expect(
      classifyPlanChange({ plan: "power", cadence: "monthly" }, { plan: "pro", cadence: "yearly" }),
    ).toBe("downgrade");
  });

  it("reads monthly → yearly as an upgrade and yearly → monthly as a downgrade", () => {
    // Same tier, so cadence decides. Dropping to monthly shortens what has been
    // paid for; doing that immediately is a refund we don't want to owe.
    expect(
      classifyPlanChange({ plan: "pro", cadence: "monthly" }, { plan: "pro", cadence: "yearly" }),
    ).toBe("upgrade");
    expect(
      classifyPlanChange({ plan: "pro", cadence: "yearly" }, { plan: "pro", cadence: "monthly" }),
    ).toBe("downgrade");
  });

  it("reports no change when the selection matches", () => {
    // The caller short-circuits on this. Without it, re-submitting the form
    // would release and rebuild a Stripe schedule for no reason.
    expect(
      classifyPlanChange({ plan: "power", cadence: "yearly" }, { plan: "power", cadence: "yearly" }),
    ).toBe("unchanged");
  });
});

describe("planChangeTiming", () => {
  it("applies an upgrade immediately", () => {
    // Safe in both processors: Stripe prorates the item swap and Razorpay
    // invoices the difference. The customer asked to pay us more — making them
    // wait for it is the wrong answer.
    expect(planChangeTiming("upgrade")).toBe("immediate");
  });

  it("defers a downgrade to the period end", () => {
    // THE money rule. An immediate downgrade makes Stripe credit, and Razorpay
    // outright REFUND, the unused difference — a liability on revenue already
    // recognised. Deferring costs the customer nothing: they keep the higher
    // tier they paid for until it runs out.
    expect(planChangeTiming("downgrade")).toBe("period_end");
  });
});

describe("canChangeRazorpayPlan", () => {
  it("allows a change only in the states Razorpay's update API accepts", () => {
    expect(canChangeRazorpayPlan("active")).toBe(true);
    expect(canChangeRazorpayPlan("authenticated")).toBe(true);
  });

  it("refuses a halted or pending subscription", () => {
    // Razorpay rejects an update for these outright. A halted subscriber —
    // payment retries exhausted, stored as past_due — reaches the settings page
    // like anyone else, and deserves a sentence they can act on rather than a
    // raw processor error surfacing as "something went wrong".
    expect(canChangeRazorpayPlan("halted")).toBe(false);
    expect(canChangeRazorpayPlan("pending")).toBe(false);
    expect(canChangeRazorpayPlan("created")).toBe(false);
  });
});

describe("planChangeOffers", () => {
  it("omits the combination already in effect and classifies the rest", () => {
    // The picker renders straight from this: the current plan must not appear
    // as a clickable change, and each remaining button has to carry the timing
    // the server will actually apply — not a second copy of the rule in the
    // browser that can drift from it.
    const available = [
      { plan: "pro", cadence: "monthly" },
      { plan: "pro", cadence: "yearly" },
      { plan: "power", cadence: "yearly" },
    ] as const;
    expect(planChangeOffers({ plan: "pro", cadence: "yearly" }, available)).toEqual([
      { plan: "pro", cadence: "monthly", direction: "downgrade", timing: "period_end" },
      { plan: "power", cadence: "yearly", direction: "upgrade", timing: "immediate" },
    ]);
  });

  it("offers nothing when the only combination for sale is the current one", () => {
    // Otherwise the picker would render a button that re-books the plan the
    // customer is already on.
    expect(
      planChangeOffers({ plan: "power", cadence: "monthly" }, [{ plan: "power", cadence: "monthly" }]),
    ).toEqual([]);
  });
});
