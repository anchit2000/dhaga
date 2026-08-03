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

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler(response: RazorpayHandlerResponse): void;
  modal?: { ondismiss?(): void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

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
 * INR checkout. Pays through Razorpay's hosted modal, then hands the signed
 * response to /api/razorpay/verify — the plan is only granted once the server
 * has re-read the order from Razorpay, so nothing here is trusted.
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
          // Money may well have left the customer's account here, so never say
          // "payment failed" — say it isn't confirmed yet and keep the id.
          toast.error(
            `Payment received but not yet confirmed. Quote ${response.razorpay_payment_id} if it doesn't appear shortly.`,
          );
          return;
        }
        toast.success("Payment confirmed — your plan is active.");
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
      if (!created.ok) throw new Error("order creation failed");
      const order = (await created.json()) as {
        orderId: string;
        amountPaise: number;
        currency: string;
        keyId: string;
      };
      const checkout = window.Razorpay;
      if (!checkout) throw new Error("checkout unavailable");

      const instance = new checkout({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: RAZORPAY_CHECKOUT_NAME,
        description: RAZORPAY_PLAN_DESCRIPTION[plan],
        order_id: order.orderId,
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
