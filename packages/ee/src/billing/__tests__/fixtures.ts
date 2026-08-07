import type { SubscriptionRow } from "../../db/schema";

/**
 * One subscription-row builder for the whole billing suite. Shared rather than
 * copied per file so that adding a column (as the denormalised plan state did)
 * is one edit, not a hunt for every fixture that silently stopped compiling.
 *
 * The defaults are the least-entitled shape that is still a valid row: free-ish
 * Pro/active with no processor ids, no cadence, never synced. Every test states
 * exactly the fields its assertion depends on.
 */
export function subscriptionRow(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "sub-row",
    userId: "user-1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    razorpaySubscriptionId: null,
    razorpayPaymentId: null,
    plan: "pro",
    status: "active",
    cadence: null,
    scheduledPlan: null,
    scheduledCadence: null,
    scheduledChangeAt: null,
    syncedAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
