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

/** The route cannot host the modal at all — distinct from a payment failure,
 *  because no amount of retrying will help and the fix is ours, not the user's. */
export class CheckoutBlockedError extends Error {
  constructor() {
    super(
      "Razorpay Checkout cannot open on a cross-origin-isolated page: remove " +
        "Cross-Origin-Embedder-Policy from this route (apps/web/next.config.ts).",
    );
    this.name = "CheckoutBlockedError";
  }
}

/**
 * Razorpay's modal is a cross-origin iframe served by api.razorpay.com, which
 * sends no COEP header of its own. A document carrying
 * `Cross-Origin-Embedder-Policy` therefore makes Chrome block that frame with
 * ERR_BLOCKED_BY_RESPONSE and paint its own "api.razorpay.com refused to
 * connect" page inside an otherwise-empty modal — no console error, no failed
 * promise, nothing to debug from. `credentialless` does not save us: it relaxes
 * COEP for no-cors subresources, never for nested frames.
 *
 * So check before opening and fail with a sentence naming the cause. Shipped
 * after exactly this bug cost a full investigation; /app/settings now opts out
 * of isolation in next.config.ts, and this is the tripwire if that regresses.
 *
 * `crossOriginIsolated` is the only COEP-adjacent signal a page can read about
 * itself, and it is true only when COOP *and* COEP are both set — so this
 * catches the isolated-route case (the one we actually ship) but not a route
 * that somehow sends COEP without COOP. Better a guard with a known blind spot
 * than a blank frame.
 */
export function assertCheckoutEmbeddable(): void {
  if (window.crossOriginIsolated) throw new CheckoutBlockedError();
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
