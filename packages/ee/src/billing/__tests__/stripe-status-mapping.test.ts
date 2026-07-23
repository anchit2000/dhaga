import { describe, expect, it } from "vitest";
import { STRIPE_STATUS_TO_STORED } from "../webhook";

/**
 * Entitlement (hasUnlimitedAi, billing/index.ts) is granted only when the
 * stored status is `active`. The webhook must therefore preserve `active` for
 * every Stripe status that represents a user in good standing — and the bug
 * this guards against collapsed everything non-`active` (including `trialing`)
 * to `past_due`, silently stripping trialing users of their entitlement. These
 * tests fail if that regresses or if a genuinely delinquent/ended status is
 * ever mapped to `active`.
 */
describe("STRIPE_STATUS_TO_STORED", () => {
  it("keeps entitlement (maps to `active`) for in-good-standing statuses", () => {
    expect(STRIPE_STATUS_TO_STORED.active).toBe("active");
    // The regression: trialing users must stay entitled, not be marked delinquent.
    expect(STRIPE_STATUS_TO_STORED.trialing).toBe("active");
  });

  it("does not grant entitlement for delinquent or ended statuses", () => {
    expect(STRIPE_STATUS_TO_STORED.past_due).toBe("past_due");
    expect(STRIPE_STATUS_TO_STORED.unpaid).toBe("past_due");
    expect(STRIPE_STATUS_TO_STORED.paused).toBe("past_due");
    expect(STRIPE_STATUS_TO_STORED.canceled).toBe("canceled");
    expect(STRIPE_STATUS_TO_STORED.incomplete_expired).toBe("canceled");
    expect(STRIPE_STATUS_TO_STORED.incomplete).toBe("incomplete");
  });

  it("only ever maps to a status this app stores, and never entitles a non-standing status", () => {
    const stored = new Set(["active", "past_due", "canceled", "incomplete"]);
    for (const [stripeStatus, mapped] of Object.entries(STRIPE_STATUS_TO_STORED)) {
      expect(stored.has(mapped)).toBe(true);
      if (mapped === "active") {
        expect(["active", "trialing"]).toContain(stripeStatus);
      }
    }
  });
});
