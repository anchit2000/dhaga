import { approveUser, isUserApproved } from "./repo";

/**
 * The hosted pending-approval gate — "payment is the invite".
 *
 * Signup is open to anyone; the account is created UNAPPROVED and can reach
 * only /pending, the checkout that pays for it, and sign-out. Approval is
 * granted by exactly three things, and nothing else:
 *   1. an admin approving the access request (access-requests/repo.ts),
 *   2. a payment the PROCESSOR has confirmed — the webhook, never the
 *      checkout-intent or the browser redirect, so an abandoned checkout
 *      grants nothing (billing/webhook.ts, billing/razorpay/webhook.ts),
 *   3. an admin comp plan (admin/subscription-admin/set-subscription.ts).
 * Refund and chargeback revoke it; cancellation does NOT — they paid for the
 * term they are in. A revocation resolves the account through the PAYMENT
 * LEDGER (billing/payments) — one row per charge, keyed on the processor's
 * payment id — rather than through Razorpay `notes`, which is not documented to
 * be copied onto subscription-charge payments. ./repo's by-customer and
 * by-payment lookups are the fallback for pre-ledger charges.
 *
 * Only the two methods core needs are on the gate. Revocation and the
 * by-email/by-processor lookups stay internal to EE (the callers are all
 * EE-side), so the open-core contract stays as small as possible.
 */
export const approvalGate = {
  isApproved: isUserApproved,
  approve: approveUser,
};

export * from "./repo";
