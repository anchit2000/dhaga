import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscriptionRow } from "./fixtures";
import type { SubscriptionRow } from "../../db/schema";

/**
 * THE property this whole change exists to establish, pinned so it cannot
 * silently come back.
 *
 * `getPlanSummary` is what `currentPlan` → `hasFeature` / `requireFeature`
 * (apps/web/src/lib/entitlements) resolve through, and those run per MCP
 * request, per AI action, per gated settings control, on `toggleWatch`, and so
 * on. It used to reach a LIVE Stripe/Razorpay API through `getCurrentPlanState`
 * → `describePlan`. Correctness was fine — plan and status always came from our
 * own row and the processor call was try/caught — but every entitlement check
 * was a payment-API round-trip: latency on hot paths, rate-limit exposure, and
 * a processor outage degrading features unrelated to payment.
 *
 * The stubs below THROW rather than return. A regression that reintroduced a
 * processor read would otherwise be invisible here (the old code swallowed the
 * failure and returned null) and visible only in production latency graphs.
 */
const describeStripePlan = vi.fn(() => {
  throw new Error("ENTITLEMENT PATH CALLED STRIPE — see the note at the top of this file");
});
const describeRazorpayPlan = vi.fn(() => {
  throw new Error("ENTITLEMENT PATH CALLED RAZORPAY — see the note at the top of this file");
});
vi.mock("../plan-change/stripe", () => ({
  describeStripePlan,
  cancelStripePlan: vi.fn(),
  changeStripePlan: vi.fn(),
  clearStripeScheduledChange: vi.fn(),
  resumeStripePlan: vi.fn(),
}));
vi.mock("../plan-change/razorpay", () => ({
  describeRazorpayPlan,
  cancelRazorpayPlan: vi.fn(),
  changeRazorpayPlan: vi.fn(),
  clearRazorpayScheduledChange: vi.fn(),
}));

// The SDK factories are stubbed too, so an accidental direct call (bypassing
// the describe* helpers) fails just as loudly.
vi.mock("../stripe-client", () => ({
  stripeEnabled: () => true,
  getStripe: () => {
    throw new Error("ENTITLEMENT PATH CONSTRUCTED A STRIPE CLIENT");
  },
}));
vi.mock("../razorpay", () => ({ razorpayEnabled: () => true }));

let storedRow: SubscriptionRow | null = null;
vi.mock("../repo", () => ({
  getSubscriptionForUser: async () => storedRow,
  patchSubscriptionForUser: vi.fn(),
}));

const { getPlanSummary, hasUnlimitedAi } = await import("../index");

describe("an entitlement check never calls a payment processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_yearly";
    process.env.STRIPE_PRICE_POWER_MONTHLY = "price_power_monthly";
  });

  it("resolves a live Stripe subscriber's plan from the row alone", async () => {
    storedRow = subscriptionRow({
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      plan: "pro",
      cadence: "yearly",
      currentPeriodEnd: new Date("2027-01-01T00:00:00Z"),
      syncedAt: new Date("2026-08-01T00:00:00Z"),
    });

    const summary = await getPlanSummary("user-1");

    expect(describeStripePlan).not.toHaveBeenCalled();
    expect(summary?.plan).toBe("pro");
    // The cadence is the fact that used to require the round-trip; it now comes
    // off the denormalised column, and the change offers are derived from it.
    expect(summary?.current?.cadence).toBe("yearly");
    expect(summary?.current?.renewsAt).toEqual(new Date("2027-01-01T00:00:00Z"));
    expect(summary?.current?.syncedAt).toEqual(new Date("2026-08-01T00:00:00Z"));
    expect(summary?.current?.changes.length).toBeGreaterThan(0);
  });

  it("resolves a live Razorpay subscriber's plan from the row alone", async () => {
    storedRow = subscriptionRow({
      razorpaySubscriptionId: "rzp_sub_1",
      plan: "power",
      cadence: "monthly",
    });

    const summary = await getPlanSummary("user-1");

    expect(describeRazorpayPlan).not.toHaveBeenCalled();
    expect(summary?.current?.processor).toBe("razorpay");
    expect(summary?.current?.cadence).toBe("monthly");
  });

  it("surfaces a booked change from the row, without asking who booked it", async () => {
    storedRow = subscriptionRow({
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      plan: "power",
      cadence: "monthly",
      scheduledPlan: "pro",
      scheduledCadence: "yearly",
      scheduledChangeAt: new Date("2026-09-01T00:00:00Z"),
    });

    const summary = await getPlanSummary("user-1");

    expect(describeStripePlan).not.toHaveBeenCalled();
    expect(summary?.current?.pending).toEqual({
      plan: "pro",
      cadence: "yearly",
      effectiveAt: new Date("2026-09-01T00:00:00Z"),
    });
  });

  it("still answers for a row a processor has never confirmed", async () => {
    // Written before the denormalised columns existed: no cadence, so no change
    // offers (we will not guess a billing direction) — but the plan surface must
    // still render, and still without a round-trip.
    storedRow = subscriptionRow({ stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" });

    const summary = await getPlanSummary("user-1");

    expect(describeStripePlan).not.toHaveBeenCalled();
    expect(summary?.current?.cadence).toBeNull();
    expect(summary?.current?.changes).toEqual([]);
    expect(summary?.current?.syncedAt).toBeNull();
  });

  it("keeps hasUnlimitedAi — the hottest caller — off the processor", async () => {
    storedRow = subscriptionRow({
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      currentPeriodEnd: new Date("2099-01-01T00:00:00Z"),
    });

    expect(await hasUnlimitedAi("user-1")).toBe(true);
    expect(describeStripePlan).not.toHaveBeenCalled();
    expect(describeRazorpayPlan).not.toHaveBeenCalled();
  });
});
