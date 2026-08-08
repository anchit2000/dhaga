import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRecordPayment = vi.fn();
vi.mock("../../payments", () => ({
  recordPayment: (...args: unknown[]) => mockRecordPayment(...args),
  applyPaymentOutcome: async () => null,
}));

const mockUpsertSubscription = vi.fn();
vi.mock("../../repo", () => ({
  upsertSubscription: (...args: unknown[]) => mockUpsertSubscription(...args),
  getSubscriptionForUser: async () => null,
}));

vi.mock("../../../approval/repo", () => ({
  approveUser: vi.fn(),
  revokeUserApproval: vi.fn(),
  revokeApprovalForRazorpayPayment: vi.fn(),
}));
vi.mock("../../catalog", () => ({
  tierForRazorpayPlanId: () => "power",
  selectionForRazorpayPlanId: () => ({ plan: "power", cadence: "yearly" }),
}));
vi.mock("../config", () => ({ getRazorpayWebhookSecret: () => "secret" }));
vi.mock("../verify", () => ({ isValidWebhookSignature: () => true }));

const { handleRazorpayWebhook } = await import("../webhook");

function send(event: string, payload: unknown): Promise<void> {
  return handleRazorpayWebhook(JSON.stringify({ event, payload }), "sig");
}

function subscription(status: string, extra: Record<string, unknown> = {}) {
  return {
    entity: {
      id: "sub_1",
      status,
      plan_id: "plan_1",
      notes: { userId: "user_1" },
      ...extra,
    },
  };
}

/**
 * The ledger exists because `subscriptions.razorpay_payment_id` was a single
 * scalar overwritten every renewal — the latest payment and nothing else. What
 * these tests protect is the accuracy of the row that replaced it, since a
 * ledger nobody can reconcile against a settlement report is worse than none.
 */
describe("Razorpay webhook — payment ledger writes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records amount in INTEGER minor units with the tier and cadence bought", async () => {
    await send("subscription.charged", {
      subscription: subscription("active", { current_start: 1_760_000_000 }),
      payment: { entity: { id: "pay_1", amount: 79900, currency: "inr" } },
    });
    expect(mockRecordPayment).toHaveBeenCalledWith({
      userId: "user_1",
      processor: "razorpay",
      processorPaymentId: "pay_1",
      processorSubscriptionId: "sub_1",
      // Paise, straight through. Never rupees, never a float, never a string —
      // a reconciliation that compares rounded decimals is not a reconciliation.
      amountMinor: 79900,
      currency: "INR",
      status: "captured",
      // The plan bought AT THE TIME, which a later change would have moved on
      // the subscription row but must never move on the charge.
      plan: "power",
      cadence: "yearly",
      // The PROCESSOR's timestamp, not ours.
      occurredAt: new Date(1_760_000_000 * 1000),
    });
  });

  it("does NOT record a charge for a mandate that has not been charged", async () => {
    // `authenticated` means consent, not money. A ledger row here would invent
    // a payment that never happened.
    await send("subscription.activated", {
      subscription: subscription("authenticated"),
      payment: { entity: { id: "pay_1", amount: 79900 } },
    });
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("does not record anything when the event carries no payment", async () => {
    await send("subscription.activated", { subscription: subscription("active") });
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("denormalises cadence onto the subscription row, so entitlement reads stay local", async () => {
    await send("subscription.charged", {
      subscription: subscription("active", { current_end: 1_800_000_000 }),
      payment: { entity: { id: "pay_1" } },
    });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ cadence: "yearly", scheduled: null }),
    );
  });

  it("leaves a booked change alone while the processor still reports one", async () => {
    // The event carries only the flag, not the target plan, so clearing or
    // rewriting the stored target here would lose it until the next reconcile.
    await send("subscription.charged", {
      subscription: subscription("active", { has_scheduled_changes: true }),
      payment: { entity: { id: "pay_1" } },
    });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.not.objectContaining({ scheduled: null }),
    );
  });

  it("passes a null current_end through as null, for upsertSubscription to preserve", async () => {
    // Razorpay returns null in the `created` state and a null renewal boundary
    // reads as "never expires" to isUnlimitedAiSub, so the non-erasing rule
    // lives in the writer — this only pins that the webhook doesn't invent one.
    await send("subscription.pending", { subscription: subscription("pending") });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ currentPeriodEnd: null }),
    );
  });
});
