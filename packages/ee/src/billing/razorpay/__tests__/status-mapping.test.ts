import { describe, expect, it } from "vitest";
import { RAZORPAY_STATUS_TO_STORED } from "../webhook";

/**
 * WHY THIS SUITE EXISTS: entitlement is granted for exactly one stored status
 * (`active`, see billing/index.ts's isUnlimitedAiSub). This map is therefore
 * the only thing standing between Razorpay's eight subscription states and
 * giving Pro away. Each case is a state that could wrongly grant or wrongly
 * revoke, not a restatement of the table.
 */
describe("RAZORPAY_STATUS_TO_STORED", () => {
  it("does not grant for an approved-but-uncharged mandate", () => {
    // `authenticated` means the customer approved the mandate; no money has
    // moved. Mapping it to `active` would let anyone approve, immediately
    // cancel, and keep Pro for free.
    expect(RAZORPAY_STATUS_TO_STORED.authenticated).toBe("incomplete");
    expect(RAZORPAY_STATUS_TO_STORED.created).toBe("incomplete");
  });

  it("ends the entitlement when a plan runs to completion", () => {
    // `completed` is success, not failure — but total_count is exhausted and
    // nothing further will be charged, so continuing to grant Pro is a gift.
    expect(RAZORPAY_STATUS_TO_STORED.completed).toBe("canceled");
    expect(RAZORPAY_STATUS_TO_STORED.expired).toBe("canceled");
  });

  it("keeps a retrying subscription out of active without cancelling it", () => {
    // past_due is recoverable: Razorpay may still collect, so the row must not
    // read as cancelled — but the user must not keep unlimited AI meanwhile.
    expect(RAZORPAY_STATUS_TO_STORED.pending).toBe("past_due");
    expect(RAZORPAY_STATUS_TO_STORED.halted).toBe("past_due");
  });

  it("grants for `active` and nothing else", () => {
    // The guard that matters: if a future edit maps any other state onto
    // `active`, this fails rather than silently widening who gets Pro.
    const granting = Object.entries(RAZORPAY_STATUS_TO_STORED)
      .filter(([, stored]) => stored === "active")
      .map(([razorpay]) => razorpay);
    expect(granting).toEqual(["active"]);
  });
});
