import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WHY THIS SUITE EXISTS: checkout is the ONLY place a founding seat is granted,
 * so it is the only place the cap can be enforced. The pricing page's "N seats
 * left" is a hint that can be minutes stale — if the last seat goes between the
 * render and the click, this is what has to say no, BEFORE a Razorpay
 * subscription (and a mandate on the buyer's card) exists.
 */
const claimFoundingSeat = vi.fn<(userId: string) => Promise<number | null>>();
const createSubscription = vi.fn(async () => ({ id: "sub_created" }));

vi.mock("../founding", async () => {
  const actual = await vi.importActual<typeof import("../founding/cap")>("../founding/cap");
  return { claimFoundingSeat, FoundingSoldOutError: actual.FoundingSoldOutError };
});
vi.mock("../repo", () => ({ getSubscriptionForUser: async () => null }));
vi.mock("../razorpay/client", () => ({ createSubscription }));
vi.mock("../razorpay/config", () => ({ getRazorpayCredentials: () => ({ keyId: "rzp_key" }) }));

const { createRazorpayCheckout } = await import("../razorpay/checkout");
const { FoundingSoldOutError } = await import("../founding/cap");

const FOUNDING = { plan: "pro", cadence: "founding_yearly" } as const;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_PLAN_PRO_FOUNDING_YEARLY = "plan_founding";
  process.env.RAZORPAY_PLAN_PRO_YEARLY = "plan_pro_yearly";
});

describe("buying a founding seat", () => {
  it("claims a seat and checks out against the founding plan", async () => {
    claimFoundingSeat.mockResolvedValue(37);
    expect(await createRazorpayCheckout("user-1", FOUNDING)).toEqual({
      subscriptionId: "sub_created",
      keyId: "rzp_key",
    });
    expect(claimFoundingSeat).toHaveBeenCalledWith("user-1");
    expect(createSubscription).toHaveBeenCalledWith({
      planId: "plan_founding",
      userId: "user-1",
      tier: "pro",
    });
  });

  it("refuses when the seats are gone, without creating a subscription", async () => {
    // The failure has to land here rather than at the webhook: a buyer whose
    // card has already been mandated cannot be told the offer expired.
    claimFoundingSeat.mockResolvedValue(null);
    await expect(createRazorpayCheckout("user-1", FOUNDING)).rejects.toBeInstanceOf(
      FoundingSoldOutError,
    );
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it("never claims a seat for a plan the founding offer doesn't cover", async () => {
    // `power` with a founding cadence has no plan id at all. Resolving the id
    // first means that request fails without consuming one of the 500.
    await expect(
      createRazorpayCheckout("user-1", { plan: "power", cadence: "founding_yearly" }),
    ).rejects.toThrow(/isn't for sale/i);
    expect(claimFoundingSeat).not.toHaveBeenCalled();
  });

  it("leaves an ordinary purchase untouched", async () => {
    await createRazorpayCheckout("user-1", { plan: "pro", cadence: "yearly" });
    expect(claimFoundingSeat).not.toHaveBeenCalled();
  });
});
