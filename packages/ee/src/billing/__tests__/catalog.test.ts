import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  availableCombinations,
  parsePlanSelection,
  selectionForRazorpayPlanId,
  tierForRazorpayPlanId,
} from "../catalog";

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
  "RAZORPAY_PLAN_PRO_FOUNDING_YEARLY",
  "RAZORPAY_PLAN_POWER_MONTHLY",
  "RAZORPAY_PLAN_POWER_YEARLY",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
  "STRIPE_PRICE_POWER_MONTHLY",
  "STRIPE_PRICE_POWER_ANNUAL",
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

  it("rejects a plan that is no longer sold", () => {
    // `lifetime` used to be a tier. A stale client (or a curious user) posting
    // it must get a 400, not a free never-expiring plan.
    expect(parsePlanSelection({ plan: "lifetime" })).toBeNull();
    expect(parsePlanSelection({ plan: "lifetime", cadence: "yearly" })).toBeNull();
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

describe("Founding Pro in the catalog", () => {
  it("resolves the founding plan id to the pro TIER, not a tier of its own", () => {
    // It grants exactly Pro. Anything else — a null, a new tier — would either
    // strand a paying founding member with no entitlement or invent a plan the
    // rest of the app has no rules for.
    process.env.RAZORPAY_PLAN_PRO_FOUNDING_YEARLY = "plan_founding";
    expect(tierForRazorpayPlanId("plan_founding")).toBe("pro");
    expect(selectionForRazorpayPlanId("plan_founding")).toEqual({
      plan: "pro",
      cadence: "founding_yearly",
    });
  });

  it("keeps founding out of the combinations anyone may buy or switch to", () => {
    // availableCombinations feeds BOTH the buy grid and planChangeOffers. A
    // founding entry here would let an existing subscriber switch onto the
    // discount from the settings page, with no seat cap anywhere on that path.
    process.env.RAZORPAY_PLAN_PRO_YEARLY = "plan_pro_yr";
    process.env.RAZORPAY_PLAN_PRO_FOUNDING_YEARLY = "plan_founding";
    expect(availableCombinations("razorpay")).toEqual([{ plan: "pro", cadence: "yearly" }]);
  });

  it("parses a founding selection — a shape check is not an authorisation", () => {
    // The parser's job is 400-vs-not. Whether the seat EXISTS is decided
    // server-side by the cap in billing/founding, and changePlan refuses it
    // outright; neither belongs in a body parser.
    expect(parsePlanSelection({ plan: "pro", cadence: "founding_yearly" })).toEqual({
      plan: "pro",
      cadence: "founding_yearly",
    });
  });
});

describe("availableCombinations", () => {
  it("offers only what has a configured price", () => {
    // The UI renders from this. A combination without a price id would give a
    // button that always errors, which is worse than no button.
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_yr";
    expect(availableCombinations("stripe")).toEqual([{ plan: "pro", cadence: "yearly" }]);
  });

  it("is empty when nothing is configured", () => {
    expect(availableCombinations("razorpay")).toEqual([]);
  });
});
