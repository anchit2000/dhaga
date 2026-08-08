"use client";

import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/app/ActionForm";
import { RazorpayCheckoutButton } from "@/components/app/settings/RazorpayCheckoutButton";
import { changePlanAction, createCheckoutSessionAction } from "@/lib/actions/billing";
import { formatDate } from "@/utils/format-date";
import type { CurrentPlanState, PlanChangeOffer, PlanOffer, PlanSummary } from "@/lib/hosted/gate";
import type { Processor } from "@/lib/billing/processor";

/**
 * The two button sets the plan surface can show for one (tier, cadence) cell:
 * BUY (no live subscription — mints a new one) and CHANGE (modifies the one
 * that exists). They are separate on purpose: routing a subscriber through
 * checkout would leave two subscriptions billing one card.
 */
function offered(list: PlanOffer[], selection: PlanOffer): boolean {
  return list.some((o) => o.plan === selection.plan && o.cadence === selection.cadence);
}

/**
 * `preferred` (from the request's country) decides which processor's button
 * comes FIRST, never which is available: both stay clickable wherever both are
 * configured, because IP geo is wrong often enough that locking someone out of
 * paying is the worse failure. It does NOT decide the currency shown — see
 * chargingProcessor in lib/billing/display-currency.
 */
export function buyActions(
  summary: PlanSummary,
  selection: PlanOffer,
  label: string,
  preferred: Processor,
): React.ReactElement[] {
  const order: Processor[] =
    preferred === "razorpay" ? ["razorpay", "stripe"] : ["stripe", "razorpay"];
  return order.flatMap((processor) => {
    if (!offered(summary.offers[processor], selection)) return [];
    if (processor === "razorpay") {
      return [
        <RazorpayCheckoutButton key="razorpay" selection={selection} label={`${label} — INR`} />,
      ];
    }
    return [
      <ActionForm
        key="stripe"
        action={createCheckoutSessionAction}
        errorMessage="Couldn't start checkout — please try again."
      >
        <input type="hidden" name="plan" value={selection.plan} />
        <input type="hidden" name="cadence" value={selection.cadence} />
        <Button type="submit" size="sm">
          {label}
        </Button>
      </ActionForm>,
    ];
  });
}

/**
 * When the change takes effect, in words the customer can act on. `direction`
 * and `timing` were decided server-side by the same code that will run the
 * change — this only renders them, so the label can never promise a billing
 * moment the server won't honour.
 */
export function timingNote(offer: PlanChangeOffer, renewsAt: Date | null): string {
  if (offer.timing === "immediate") return "Takes effect now, prorated";
  return renewsAt ? `Starts ${formatDate(renewsAt)}` : "Starts at your next renewal";
}

export function changeActions(
  current: CurrentPlanState,
  offer: PlanChangeOffer,
  label: string,
): React.ReactElement {
  return (
    <ActionForm
      action={changePlanAction}
      errorMessage="Couldn't change the plan — please try again."
    >
      <input type="hidden" name="plan" value={offer.plan} />
      <input type="hidden" name="cadence" value={offer.cadence} />
      <Button type="submit" size="sm" variant={offer.direction === "upgrade" ? "default" : "outline"}>
        {label}
      </Button>
      <p className="mt-2 text-xs text-fog">{timingNote(offer, current.renewsAt)}</p>
    </ActionForm>
  );
}
