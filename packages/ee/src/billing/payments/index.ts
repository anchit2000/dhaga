/**
 * The payment ledger: one row per charge, on either processor.
 *
 * `subscriptions.razorpay_payment_id` used to be the whole record — a single
 * scalar overwritten every renewal, so there was no history, no receipts, no
 * per-charge refund resolution and nothing to reconcile a settlement report
 * against. Written by both webhooks and by the Razorpay browser-confirm path;
 * read by the approval feature to resolve a refund back to an account.
 */
export { applyPaymentOutcome, findPaymentUserId, recordPayment } from "./repo";
export type { PaymentOutcomeInput, RecordPaymentInput } from "./types";
