import { describe, expect, it } from "vitest";
import { activeSubscriptionRef, isTierDowngrade } from "../plan-change/decide";
import { canAdminDowngrade } from "../../admin/subscription-admin/downgrade-rule";
import { subscriptionRow } from "./fixtures";
import type { SubscriptionRow } from "../../db/schema";

/**
 * WHY THIS SUITE EXISTS: three guards, each protecting against a silent, costly
 * mistake.
 *   - activeSubscriptionRef is the ONLY thing standing between a plan change
 *     and a second subscription. Miss a live one and the customer's card is
 *     charged twice a month invisibly — our table holds one row per user, so
 *     the newer write simply overwrites the older and nothing looks wrong.
 *   - isTierDowngrade recognises that a tier is being lowered at all.
 *   - canAdminDowngrade decides who is allowed to do it: an admin may undo a
 *     comp they granted, but must not strip a plan someone is paying for, which
 *     would leave the processor billing a card for revoked access.
 */
function row(fields: Partial<SubscriptionRow>): SubscriptionRow {
  return subscriptionRow(fields);
}

describe("activeSubscriptionRef — the no-second-subscription guard", () => {
  it("reports the processor subscription that a change must modify", () => {
    expect(activeSubscriptionRef(row({ stripeSubscriptionId: "sub_123" }))).toEqual({
      processor: "stripe",
      subscriptionId: "sub_123",
    });
    expect(activeSubscriptionRef(row({ razorpaySubscriptionId: "sub_rzp" }))).toEqual({
      processor: "razorpay",
      subscriptionId: "sub_rzp",
    });
  });

  it("counts an unpaid-but-live subscription as existing", () => {
    // past_due and incomplete still have an object at the processor. On
    // Razorpay `incomplete` is an approved mandate that starts charging on its
    // own — buying again there gives the customer two mandates on one card.
    expect(
      activeSubscriptionRef(row({ status: "past_due", razorpaySubscriptionId: "sub_rzp" })),
    ).not.toBeNull();
    expect(
      activeSubscriptionRef(row({ status: "incomplete", razorpaySubscriptionId: "sub_rzp" })),
    ).not.toBeNull();
  });

  it("lets a cancelled subscriber buy again", () => {
    // Nothing is left to modify, so checkout is the only route back. Blocking
    // it would lock a returning customer out of paying us.
    expect(
      activeSubscriptionRef(row({ status: "canceled", stripeSubscriptionId: "sub_123" })),
    ).toBeNull();
  });

  it("lets an admin-comped user buy a real plan", () => {
    // A comp row has the `admin-granted:` sentinel and NO processor
    // subscription, so there is nothing to duplicate. Treating the row's mere
    // existence as "already subscribed" would leave comped users unable to
    // convert to paying ones.
    expect(
      activeSubscriptionRef(row({ plan: "power", stripeCustomerId: "admin-granted:user-1" })),
    ).toBeNull();
  });

  it("has nothing to modify for a user with no row", () => {
    expect(activeSubscriptionRef(null)).toBeNull();
  });
});

describe("isTierDowngrade", () => {
  it("recognises a lowered tier, free included", () => {
    expect(isTierDowngrade("power", "pro")).toBe(true);
    expect(isTierDowngrade("pro", "free")).toBe(true);
  });

  it("does not fire on a raise or a re-save", () => {
    // Re-saving is how an admin edits only the expiry — it must not be read as
    // a downgrade and rejected.
    expect(isTierDowngrade("free", "pro")).toBe(false);
    expect(isTierDowngrade("pro", "power")).toBe(false);
    expect(isTierDowngrade("pro", "pro")).toBe(false);
  });
});

describe("canAdminDowngrade — comp vs paying customer", () => {
  it("lets an admin undo a comp they granted", () => {
    // The sentinel customer id with no processor subscription IS the comp
    // signal. Blocking this would leave a mistaken Power grant permanent.
    expect(canAdminDowngrade(row({ plan: "power", stripeCustomerId: "admin-granted:user-1" })))
      .toBe(true);
  });

  it("refuses to lower a live Stripe or Razorpay customer", () => {
    // The money is at the processor. Deleting our row would revoke access while
    // the card keeps being charged, and nothing in the app would show it.
    expect(canAdminDowngrade(row({ stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_123" })))
      .toBe(false);
    expect(canAdminDowngrade(row({ razorpaySubscriptionId: "sub_rzp" }))).toBe(false);
  });

  it("still refuses while a charge is being retried", () => {
    // past_due is not "no longer paying" — the processor is retrying, and the
    // subscription can recover on its own.
    expect(canAdminDowngrade(row({ status: "past_due", stripeSubscriptionId: "sub_123" })))
      .toBe(false);
  });

  it("lets an admin tidy up a former customer", () => {
    // Cancelled: nothing is billing any more, so the leftover row is just
    // bookkeeping an admin should be able to clear.
    expect(canAdminDowngrade(row({ status: "canceled", stripeSubscriptionId: "sub_123" })))
      .toBe(true);
  });

  it("allows anything for a user with no subscription row", () => {
    expect(canAdminDowngrade(null)).toBe(true);
  });
});
