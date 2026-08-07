import { ActionForm } from "@/components/app/ActionForm";
import { FoundingSeatCard } from "@/components/app/settings/FoundingSeatCard";
import { RazorpayCheckoutButton } from "@/components/app/settings/RazorpayCheckoutButton";
import { Button } from "@/components/ui/button";
import { TIER_LABEL } from "@/utils/constants/pricing";
import { startPendingCheckoutAction } from "./actions";
import type { FoundingOffer, PlanOffer, PlanSummary } from "@/lib/hosted/gate";
import type { Processor } from "@/lib/billing/processor";
import type { ReactElement } from "react";

/**
 * The "skip the queue" half of /pending: exactly the combinations this
 * instance has a configured price for, on whichever processors it can charge
 * through. Prices are not restated here — the pricing page owns them, and a
 * second copy on this screen is a second thing to keep true.
 *
 * Buying is the only path out of pending that the user controls; the copy above
 * these buttons must therefore be precise that access lands when the PAYMENT
 * completes, not when the button is clicked.
 */
export function PendingCheckout({
  summary,
  preferred,
  founding,
}: {
  summary: PlanSummary;
  preferred: Processor;
  /** Founding Pro while seats remain, else null. Buying it approves the account
   *  exactly like any other paid plan — through the confirmed-payment webhook,
   *  never at checkout intent. */
  founding?: FoundingOffer | null;
}): ReactElement | null {
  const order: Processor[] = preferred === "razorpay" ? ["razorpay", "stripe"] : ["stripe", "razorpay"];
  const rows = order.flatMap((processor) =>
    summary.offers[processor].map((offer) => ({ processor, offer })),
  );
  if (rows.length === 0 && !founding) return null;

  return (
    <>
    {founding ? (
      <div className="mt-6">
        <FoundingSeatCard offer={founding} />
      </div>
    ) : null}
    <div className="mt-6 flex flex-wrap gap-2">
      {rows.map(({ processor, offer }) =>
        processor === "razorpay" ? (
          <RazorpayCheckoutButton
            key={`razorpay-${offer.plan}-${offer.cadence}`}
            selection={offer}
            label={`${label(offer)} — INR`}
          />
        ) : (
          <ActionForm
            key={`stripe-${offer.plan}-${offer.cadence}`}
            action={startPendingCheckoutAction}
            errorMessage="Couldn't start checkout — please try again."
          >
            <input type="hidden" name="plan" value={offer.plan} />
            <input type="hidden" name="cadence" value={offer.cadence} />
            <Button type="submit" size="sm">
              {label(offer)}
            </Button>
          </ActionForm>
        ),
      )}
    </div>
    </>
  );
}

function label(offer: PlanOffer): string {
  return `${TIER_LABEL[offer.plan]} ${offer.cadence}`;
}
