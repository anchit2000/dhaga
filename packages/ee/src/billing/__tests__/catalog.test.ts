import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { availableCombinations, parsePlanSelection, tierForRazorpayPlanId } from "../catalog";

/**
 * WHY THIS SUITE EXISTS: the catalog decides two things that money depends on
 * — which combinations are for sale, and which tier a processor object grants.
 * Both are reached with attacker-influenced input (a request body, a plan id
 * echoed back from Razorpay), so "unknown" has to mean "no", never "assume
 * the cheapest/most generous thing".
 */
const ENV_KEYS = [
  "RAZORPAY_PLAN_PRO_MONTHLY",
  "RAZORPAY_PLAN_PRO_YEARLY",
  "RAZORPAY_PLAN_POWER_MONTHLY",
  "RAZORPAY_PLAN_POWER_YEARLY",
  "RAZORPAY_PRICE_LIFETIME_INR",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
  "STRIPE_PRICE_POWER_MONTHLY",
  "STRIPE_PRICE_POWER_ANNUAL",
  "STRIPE_PRICE_LIFETIME",
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("parsePlanSelection", () => {
  it("accepts a tier with an explicit cadence", () => {
    expect(parsePlanSelection({ plan: "power", cadence: "monthly" })).toEqual({
      plan: "power",
      cadence: "monthly",
    });
  });

  it("rejects a recurring tier with no cadence instead of defaulting", () => {
    // Defaulting would silently pick a price the buyer never chose — they'd be
    // charged monthly for something presented as yearly, or vice versa.
    expect(parsePlanSelection({ plan: "pro" })).toBeNull();
    expect(parsePlanSelection({ plan: "pro", cadence: "quarterly" })).toBeNull();
  });

  it("rejects an unknown tier", () => {
    // `free` is not purchasable, and an arbitrary string must not fall through
    // to a paid grant.
    expect(parsePlanSelection({ plan: "free", cadence: "yearly" })).toBeNull();
    expect(parsePlanSelection({ plan: "enterprise", cadence: "yearly" })).toBeNull();
    expect(parsePlanSelection(null)).toBeNull();
  });

  it("accepts lifetime without a cadence", () => {
    expect(parsePlanSelection({ plan: "lifetime" })).toEqual({ plan: "lifetime" });
  });
});

describe("tierForRazorpayPlanId", () => {
  it("resolves a configured plan id to its tier", () => {
    process.env.RAZORPAY_PLAN_POWER_YEARLY = "plan_power_yr";
    expect(tierForRazorpayPlanId("plan_power_yr")).toBe("power");
  });

  it("returns null for a real plan this instance does not sell", () => {
    // THE case that matters: a plan created in the same Razorpay account but
    // never wired up here must grant nothing. Falling back to "pro" would let
    // anyone subscribe to a ₹1 plan of their own making and be upgraded.
    process.env.RAZORPAY_PLAN_PRO_MONTHLY = "plan_pro_mo";
    expect(tierForRazorpayPlanId("plan_someone_elses")).toBeNull();
  });

  it("does not match when the env var is unset", () => {
    // An unset var reads as undefined; an undefined plan id must not compare
    // equal to anything.
    expect(tierForRazorpayPlanId("")).toBeNull();
    expect(tierForRazorpayPlanId("undefined")).toBeNull();
  });
});

describe("availableCombinations", () => {
  it("offers only what has a configured price", () => {
    // The UI renders from this. A combination without a price id would give a
    // button that always errors, which is worse than no button.
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_yr";
    process.env.STRIPE_PRICE_LIFETIME = "price_lifetime";
    expect(availableCombinations("stripe")).toEqual([
      { plan: "pro", cadence: "yearly" },
      { plan: "lifetime" },
    ]);
  });

  it("is empty when nothing is configured", () => {
    expect(availableCombinations("razorpay")).toEqual([]);
  });
});
