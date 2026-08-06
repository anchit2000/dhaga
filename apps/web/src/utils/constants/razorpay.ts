/** Razorpay's hosted Standard Checkout bundle — the only supported way to open
 *  the modal; it is loaded on first click rather than on page load so the
 *  settings route doesn't pay for a third-party script nobody clicks. */
export const RAZORPAY_CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Shown as the merchant name inside the payment modal. */
export const RAZORPAY_CHECKOUT_NAME = "Dhaga";

/** Cadence lives in the Razorpay Plan, so labels can't claim a term. */
export const RAZORPAY_PLAN_DESCRIPTION: Record<"pro" | "power", string> = {
  pro: "Dhaga Pro",
  power: "Dhaga Power",
};

/**
 * ISO-3166-1 alpha-2 countries routed to Razorpay first. India only: Razorpay
 * settles in INR and its real advantage (UPI, UPI Autopay, RBI-compliant
 * e-mandates) is domestic. Everywhere else leads with Stripe, whose Adaptive
 * Pricing handles local currency.
 *
 * This only reorders the buttons — see lib/billing/processor.ts. Both
 * processors stay reachable wherever both are configured, because IP geo is
 * wrong often enough that locking someone out of paying is the worse error.
 */
export const RAZORPAY_COUNTRIES: readonly string[] = ["IN"];
