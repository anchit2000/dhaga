"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RAZORPAY_CHECKOUT_NAME, RAZORPAY_PLAN_DESCRIPTION } from "@/utils/constants/razorpay";
import {
  loadCheckoutScript,
  type CheckoutHandoff,
  type RazorpayHandlerResponse,
} from "@/lib/billing/razorpay-modal";
import type { PlanOffer } from "@/lib/hosted/gate";

/**
 * INR checkout. Opens a Razorpay Subscription, which Razorpay re-charges on its
 * own. The signed response goes to /api/razorpay/verify, and the plan is
 * granted only once the server has re-read the subscription from Razorpay —
 * nothing here is trusted.
 *
 * Only the SELECTION is sent to the order endpoint; the price lives on the
 * server. Sending an amount from the browser would make the price negotiable.
 */
export function RazorpayCheckoutButton({
  selection,
  label,
}: {
  selection: PlanOffer;
  label: string;
}): React.ReactElement {
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
          // Money may well have left the customer's account, and the webhook
          // will still grant the plan — so never say "payment failed".
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
        body: JSON.stringify(selection),
      });
      if (!created.ok) throw new Error("checkout creation failed");
      const handoff = (await created.json()) as CheckoutHandoff;
      const checkout = window.Razorpay;
      if (!checkout) throw new Error("checkout unavailable");

      const instance = new checkout({
        key: handoff.keyId,
        name: RAZORPAY_CHECKOUT_NAME,
        description: RAZORPAY_PLAN_DESCRIPTION[selection.plan],
        subscription_id: handoff.subscriptionId,
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
  }, [selection, verify]);

  return (
    <Button onClick={() => void start()} disabled={busy} variant="outline" size="sm">
      {busy ? "Opening…" : label}
    </Button>
  );
}
