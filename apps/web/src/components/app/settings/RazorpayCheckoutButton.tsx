"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  RAZORPAY_CHECKOUT_NAME,
  RAZORPAY_CHECKOUT_SCRIPT_SRC,
  RAZORPAY_PLAN_DESCRIPTION,
} from "@/utils/constants/razorpay";

/** Razorpay returns the subscription id for Pro and the order id for Lifetime. */
interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

interface RazorpayOptions {
  key: string;
  name: string;
  description: string;
  handler(response: RazorpayHandlerResponse): void;
  modal?: { ondismiss?(): void };
  /** Orders (Lifetime) carry an explicit amount... */
  amount?: number;
  currency?: string;
  order_id?: string;
  /** ...Subscriptions (Pro) do not — the Plan owns the price and cadence. */
  subscription_id?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/** Discriminated handoff from /api/razorpay/order. */
type CheckoutHandoff =
  | { mode: "subscription"; subscriptionId: string; keyId: string }
  | { mode: "order"; orderId: string; amountPaise: number; currency: string; keyId: string };

function loadCheckoutScript(): Promise<void> {
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

/**
 * INR checkout. Pro opens a Razorpay Subscription (recurring, re-charged by
 * Razorpay); Lifetime opens a one-time Order. Either way the signed response
 * goes to /api/razorpay/verify, and the plan is granted only once the server
 * has re-read the object from Razorpay — nothing here is trusted.
 *
 * `plan` is the only thing sent to the order endpoint; the price lives on the
 * server. Sending an amount from the browser would make the price negotiable.
 */
export function RazorpayCheckoutButton({ plan }: { plan: "pro" | "lifetime" }): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const verify = useCallback(
    async (response: RazorpayHandlerResponse): Promise<void> => {
      try {
        const result = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        if (!result.ok) {
          // Money may well have left the customer's account here, and the
          // webhook will still grant the plan — so never say "payment failed".
          toast.error(
            `Payment received but not confirmed yet. Quote ${response.razorpay_payment_id} if your plan doesn't appear shortly.`,
          );
          return;
        }
        const body = (await result.json()) as { active?: boolean };
        toast.success(
          body.active
            ? "Payment confirmed — your plan is active."
            : "Payment approved — your plan activates once the first charge settles.",
        );
        router.refresh();
      } catch {
        toast.error(
          `Couldn't reach the server to confirm payment. Quote ${response.razorpay_payment_id} if your plan doesn't appear.`,
        );
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const start = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await loadCheckoutScript();
      const created = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!created.ok) throw new Error("checkout creation failed");
      const handoff = (await created.json()) as CheckoutHandoff;
      const checkout = window.Razorpay;
      if (!checkout) throw new Error("checkout unavailable");

      const instance = new checkout({
        key: handoff.keyId,
        name: RAZORPAY_CHECKOUT_NAME,
        description: RAZORPAY_PLAN_DESCRIPTION[plan],
        ...(handoff.mode === "subscription"
          ? { subscription_id: handoff.subscriptionId }
          : { order_id: handoff.orderId, amount: handoff.amountPaise, currency: handoff.currency }),
        handler: (response) => void verify(response),
        // Dismissing the modal is a cancel, not an error — no toast, just
        // release the button so they can try again.
        modal: { ondismiss: () => setBusy(false) },
      });
      instance.on("payment.failed", (response) => {
        toast.error(response.error?.description ?? "Payment failed. No money was taken.");
        setBusy(false);
      });
      instance.open();
    } catch {
      toast.error("Couldn't start checkout — please try again.");
      setBusy(false);
    }
  }, [plan, verify]);

  return (
    <Button onClick={() => void start()} disabled={busy} variant="outline" size="sm">
      {busy ? "Opening…" : `Pay in INR${plan === "lifetime" ? " (Lifetime)" : ""}`}
    </Button>
  );
}
