import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApproveUser = vi.fn();
const mockRevokeUserApproval = vi.fn();
const mockRevokeApprovalForRazorpayPayment = vi.fn();
vi.mock("../../approval/repo", () => ({
  approveUser: (...args: [string]) => mockApproveUser(...args),
  revokeUserApproval: (...args: [string]) => mockRevokeUserApproval(...args),
  revokeApprovalForRazorpayPayment: (...args: [string]) =>
    mockRevokeApprovalForRazorpayPayment(...args),
}));

const mockUpsertSubscription = vi.fn();
vi.mock("../../billing/repo", () => ({
  upsertSubscription: (...args: unknown[]) => mockUpsertSubscription(...args),
  getSubscriptionForUser: async () => null,
}));

const mockRecordPayment = vi.fn();
/** The ledger's answer to "whose payment was this". Null = no such row (a
 *  charge predating the ledger), which drives the fallback-ordering tests. */
const mockApplyPaymentOutcome = vi.fn(async (_input: unknown) => null as string | null);
vi.mock("../../billing/payments", () => ({
  recordPayment: (...args: unknown[]) => mockRecordPayment(...args),
  applyPaymentOutcome: (input: unknown) => mockApplyPaymentOutcome(input),
}));

vi.mock("../../billing/catalog", () => ({
  tierForRazorpayPlanId: () => "pro",
  selectionForRazorpayPlanId: () => ({ plan: "pro", cadence: "monthly" }),
}));
vi.mock("../../billing/razorpay/config", () => ({ getRazorpayWebhookSecret: () => "secret" }));
vi.mock("../../billing/razorpay/verify", () => ({ isValidWebhookSignature: () => true }));

const { handleRazorpayWebhook } = await import("../../billing/razorpay/webhook");

function send(event: string, payload: unknown): Promise<void> {
  return handleRazorpayWebhook(JSON.stringify({ event, payload }), "sig");
}

function subscriptionPayload(status: string) {
  return {
    subscription: {
      entity: { id: "sub_1", status, plan_id: "plan_1", notes: { userId: "user_1" } },
    },
  };
}

/**
 * "Payment is the invite": on the Razorpay path this webhook is the ONLY thing
 * that may let an account off /pending, because it is the only signal Razorpay
 * itself has confirmed the money. The failure modes worth a test are the
 * expensive ones — letting someone in who hasn't paid, keeping someone in whose
 * money went back, and losing the charge record that resolves the second one.
 */
describe("Razorpay webhook, pending-approval side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyPaymentOutcome.mockResolvedValue(null);
  });

  it("approves once the subscription is actually charged", async () => {
    await send("subscription.charged", subscriptionPayload("active"));
    expect(mockApproveUser).toHaveBeenCalledWith("user_1");
  });

  it("does NOT approve on an approved mandate that has not been charged", async () => {
    // `authenticated` is the abandon-after-mandate case: Razorpay has consent
    // but no money has moved. Approving here would hand out free access to
    // anyone who starts checkout.
    await send("subscription.activated", subscriptionPayload("authenticated"));
    expect(mockApproveUser).not.toHaveBeenCalled();
  });

  it("does NOT revoke on cancellation — the term was paid for", async () => {
    await send("subscription.cancelled", subscriptionPayload("cancelled"));
    expect(mockRevokeUserApproval).not.toHaveBeenCalled();
    expect(mockRevokeApprovalForRazorpayPayment).not.toHaveBeenCalled();
  });

  it("revokes on a refund, resolving the owner from the LEDGER", async () => {
    // The point of the ledger here. The owner used to come from the payment's
    // `notes`, on the unverified assumption that Razorpay copies a
    // subscription's notes onto its charge payments. The notes below name a
    // DIFFERENT user, so this fails if that ordering ever slips back.
    mockApplyPaymentOutcome.mockResolvedValue("ledger_user");
    await send("refund.created", {
      payment: { entity: { id: "pay_1", amount: 50000, notes: { userId: "notes_user" } } },
      refund: { entity: { payment_id: "pay_1", amount: 50000 } },
    });
    expect(mockApplyPaymentOutcome).toHaveBeenCalledWith({
      processor: "razorpay",
      processorPaymentId: "pay_1",
      status: "refunded",
    });
    expect(mockRevokeUserApproval).toHaveBeenCalledWith("ledger_user");
  });

  it("marks a part refund as partially_refunded, not refunded", async () => {
    mockApplyPaymentOutcome.mockResolvedValue("ledger_user");
    await send("refund.processed", {
      payment: { entity: { id: "pay_1", amount: 50000 } },
      refund: { entity: { payment_id: "pay_1", amount: 20000 } },
    });
    expect(mockApplyPaymentOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ status: "partially_refunded" }),
    );
  });

  it("falls back to the payment's notes for a charge the ledger never saw", async () => {
    // Pre-ledger charges are real: only the latest razorpay_payment_id per
    // subscription was backfilled, so this path still has to work.
    await send("refund.created", {
      payment: { entity: { id: "pay_1", notes: { userId: "user_1" } } },
    });
    expect(mockRevokeUserApproval).toHaveBeenCalledWith("user_1");
  });

  it("revokes on a chargeback, falling back to the stored payment id", async () => {
    await send("payment.dispute.created", { payment: { entity: { id: "pay_1" } } });
    expect(mockApplyPaymentOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ status: "disputed" }),
    );
    expect(mockRevokeApprovalForRazorpayPayment).toHaveBeenCalledWith("pay_1");
  });

  it("persists the charged payment id, so a later refund can find the account", async () => {
    await send("subscription.charged", {
      ...subscriptionPayload("active"),
      payment: { entity: { id: "pay_1" } },
    });
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ razorpayPaymentId: "pay_1" }),
    );
  });

  // The ledger WRITE side of this same handler lives with billing, in
  // billing/razorpay/__tests__/webhook-ledger.test.ts.
  it("records the charge in the ledger, so the refund lookup above has a row", async () => {
    await send("subscription.charged", {
      ...subscriptionPayload("active"),
      payment: { entity: { id: "pay_1", amount: 79900, currency: "inr" } },
    });
    expect(mockRecordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_1", processorPaymentId: "pay_1" }),
    );
  });
});
