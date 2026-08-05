/**
 * Razorpay (INR) checkout — the second processor alongside Stripe. Split by
 * responsibility: ./checkout creates the object the modal opens against,
 * ./confirm handles the browser's signed callback, ./webhook is the
 * authoritative server-to-server grant path, ./verify holds the three
 * signature schemes, ./client wraps the SDK, ./config reads env.
 */
export { razorpayEnabled } from "./config";
export { createRazorpayCheckout, type RazorpayCheckoutHandoff } from "./checkout";
export {
  confirmRazorpayPayment,
  type ConfirmFailure,
  type ConfirmInput,
  type ConfirmResult,
} from "./confirm";
export {
  isValidPaymentSignature,
  isValidSubscriptionSignature,
  isValidWebhookSignature,
} from "./verify";
export { handleRazorpayWebhook, RAZORPAY_STATUS_TO_STORED } from "./webhook";
