import { RAZORPAY_CHECKOUT_SCRIPT_SRC } from "@/utils/constants/razorpay";

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_subscription_id: string;
}

export interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

export interface RazorpayOptions {
  key: string;
  name: string;
  description: string;
  handler(response: RazorpayHandlerResponse): void;
  modal?: { ondismiss?(): void };
  /** No amount or currency: the Razorpay Plan owns both, along with cadence. */
  subscription_id: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/** Handoff returned by /api/razorpay/order. */
export interface CheckoutHandoff {
  subscriptionId: string;
  keyId: string;
}

/**
 * Loads Razorpay's hosted bundle on first use rather than on page load, so the
 * settings route doesn't pay for a third-party script nobody clicks. Resolves
 * immediately once loaded, and reuses an in-flight tag rather than appending a
 * second one when two buttons are clicked in quick succession.
 */
export function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("script failed to load")), { once: true });
    if (!existing) {
      script.src = RAZORPAY_CHECKOUT_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}
