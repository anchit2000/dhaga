/** Razorpay's hosted Standard Checkout bundle — the only supported way to open
 *  the modal; it is loaded on first click rather than on page load so the
 *  settings route doesn't pay for a third-party script nobody clicks. */
export const RAZORPAY_CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Shown as the merchant name inside the payment modal. */
export const RAZORPAY_CHECKOUT_NAME = "Dhaga";

/** Pro's cadence lives in the Razorpay Plan, so the label can't claim a term. */
export const RAZORPAY_PLAN_DESCRIPTION: Record<"pro" | "lifetime", string> = {
  pro: "Dhaga Pro",
  lifetime: "Dhaga Lifetime",
};
