"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FoundingSeatCard } from "@/components/app/settings/FoundingSeatCard";
import { chargingProcessor, currencyFor } from "@/lib/billing/display-currency";
import {
  BILLING_CADENCES,
  BILLING_TIERS,
  CADENCE_LABEL,
  PRICES,
  TIER_LABEL,
  formatPrice,
  yearlySavingPercent,
  type BillingTier,
  type StandardCadence,
} from "@/utils/constants/pricing";
import { buyActions, changeActions } from "./actions";
import type { FoundingOffer, PlanChangeOffer, PlanSummary } from "@/lib/hosted/gate";
import type { Processor } from "@/lib/billing/processor";

/**
 * One tier × cadence surface for BOTH states of a plan: buying the first one,
 * and changing the one you have. Renders only combinations the instance has a
 * configured price for, so a button never leads to a "price not set" error.
 *
 * Which set of buttons appears is decided by `summary.current`: a live
 * subscription means every action modifies it in place, and checkout is not
 * offered at all — that is what stops a subscriber ending up with two
 * subscriptions billing the same card.
 */
export function PlanPicker({
  summary,
  preferred,
  founding,
}: {
  summary: PlanSummary;
  /** Geo hint. Decides button ORDER only; the currency comes from whichever
   *  processor can actually charge (chargingProcessor). */
  preferred: Processor;
  /** Founding Pro while seats remain, else null — see FoundingSeatCard. */
  founding?: FoundingOffer | null;
}): React.ReactElement | null {
  const current = summary.current;
  // Opens on what the subscriber is already on, so the grid's first paint is
  // about their plan rather than a cadence they didn't pick. A founding member
  // opens on yearly: their price isn't a rung on this ladder, and the picker's
  // job for them is the standard options they could move to.
  const [cadence, setCadence] = useState<StandardCadence>(
    summary.current?.cadence === "monthly" ? "monthly" : "yearly",
  );

  // A subscriber is charged by the processor already holding their
  // subscription; a new buyer by whichever one this instance can sell through.
  const processor = current?.processor ?? chargingProcessor(summary.offers, preferred);
  // Nothing is for sale here and there is nothing to change — render nothing
  // rather than prices nobody can act on.
  if (!processor) return null;
  // A live subscription whose price id this instance no longer sells: we can't
  // say what they're on, so we can't say what changing would do. Better a
  // missing picker than a card that might mislabel their own plan.
  if (current && !current.cadence) return null;
  const currency = currencyFor(processor);

  function changeFor(tier: BillingTier): PlanChangeOffer | undefined {
    return current?.changes.find((c) => c.plan === tier && c.cadence === cadence);
  }

  function actionsFor(tier: BillingTier): React.ReactElement[] {
    const label = current ? `Switch to ${TIER_LABEL[tier]}` : `Go ${TIER_LABEL[tier]}`;
    if (!current) return buyActions(summary, { plan: tier, cadence }, label, preferred);
    const offer = changeFor(tier);
    return offer ? [<div key="change">{changeActions(current, offer, label)}</div>] : [];
  }

  return (
    <div className="space-y-5 border-t border-seam pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line p-0.5" role="group">
          {BILLING_CADENCES.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={cadence === option ? "default" : "ghost"}
              onClick={() => setCadence(option)}
              aria-pressed={cadence === option}
            >
              {CADENCE_LABEL[option]}
            </Button>
          ))}
        </div>
        {cadence === "yearly" ? (
          <span className="font-mono text-xs text-ember">
            Save {yearlySavingPercent(currency, "pro")}%
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BILLING_TIERS.map((tier) => {
          const price = PRICES[currency][tier][cadence];
          const actions = actionsFor(tier);
          const isCurrent =
            current?.cadence === cadence && summary.plan === tier;
          if (!actions.length && !isCurrent) return null;
          return (
            <div key={tier} className="rounded-xl border border-seam p-4">
              <p className="text-sm font-medium text-paper">{TIER_LABEL[tier]}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-xl text-paper">{formatPrice(currency, price.amount)}</span>
                {price.originalAmount ? (
                  <span className="text-sm text-fog line-through">
                    {formatPrice(currency, price.originalAmount)}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-fog">
                {cadence === "yearly"
                  ? `${formatPrice(currency, price.perMonth)}/month, billed yearly`
                  : "per month"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isCurrent ? (
                  <span className="font-mono text-xs uppercase tracking-wide text-ember">
                    Your plan
                  </span>
                ) : (
                  actions
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Only for a buyer with no live subscription: founding is a
          first-purchase price, and EE refuses it as a plan-change target. */}
      {founding && !current && processor === "razorpay" ? (
        <FoundingSeatCard offer={founding} />
      ) : null}
    </div>
  );
}
