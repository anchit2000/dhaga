"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/app/ActionForm";
import { RazorpayCheckoutButton } from "@/components/app/settings/RazorpayCheckoutButton";
import { createCheckoutSessionAction } from "@/lib/actions/billing";
import {
  CADENCE_LABEL,
  LIFETIME_PRICE,
  PRICES,
  TIER_LABEL,
  formatPrice,
  yearlySavingPercent,
  type BillingCadence,
  type BillingTier,
} from "@/utils/constants/pricing";
import type { PlanOffer, PlanSummary } from "@/lib/hosted/gate";

const TIERS: BillingTier[] = ["pro", "power"];
const CADENCES: BillingCadence[] = ["monthly", "yearly"];

function offers(list: PlanOffer[], selection: PlanOffer): boolean {
  return list.some((o) =>
    o.plan === "lifetime" || selection.plan === "lifetime"
      ? o.plan === selection.plan
      : o.plan === selection.plan && o.cadence === selection.cadence,
  );
}

/**
 * Tier × cadence picker. Renders only combinations the instance has a
 * configured price for, so a button never leads to a "price not set" error.
 *
 * `preferred` (from the request's country, lib/billing/processor) decides which
 * processor's button comes FIRST and which currency the card shows — never
 * which is available. Both remain clickable wherever both are configured,
 * because IP geo is wrong often enough that locking someone out of paying is
 * the worse failure.
 */
export function PlanPicker({
  summary,
  preferred,
}: {
  summary: PlanSummary;
  preferred: "stripe" | "razorpay";
}): React.ReactElement {
  const [cadence, setCadence] = useState<BillingCadence>("yearly");
  const currency = preferred === "razorpay" ? "INR" : "USD";
  const order: ("stripe" | "razorpay")[] =
    preferred === "razorpay" ? ["razorpay", "stripe"] : ["stripe", "razorpay"];

  function buttons(selection: PlanOffer, label: string): React.ReactElement[] {
    return order.flatMap((processor) => {
      if (!offers(summary.offers[processor], selection)) return [];
      if (processor === "razorpay") {
        return [
          <RazorpayCheckoutButton
            key="razorpay"
            selection={selection}
            label={`${label} — INR`}
          />,
        ];
      }
      return [
        <ActionForm
          key="stripe"
          action={createCheckoutSessionAction}
          errorMessage="Couldn't start checkout — please try again."
        >
          <input type="hidden" name="plan" value={selection.plan} />
          {selection.plan !== "lifetime" ? (
            <input type="hidden" name="cadence" value={selection.cadence} />
          ) : null}
          <Button type="submit" size="sm">
            {label}
          </Button>
        </ActionForm>,
      ];
    });
  }

  const lifetimeButtons = buttons({ plan: "lifetime" }, "Buy Lifetime");

  return (
    <div className="space-y-5 border-t border-seam pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line p-0.5" role="group">
          {CADENCES.map((option) => (
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
        {TIERS.map((tier) => {
          const price = PRICES[currency][tier][cadence];
          const actions = buttons({ plan: tier, cadence }, `Go ${TIER_LABEL[tier]}`);
          if (!actions.length) return null;
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
              <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
            </div>
          );
        })}
      </div>

      {lifetimeButtons.length ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-seam pt-4">
          <span className="text-sm text-fog">
            Lifetime — {formatPrice(currency, LIFETIME_PRICE[currency].amount)} once
          </span>
          {lifetimeButtons}
        </div>
      ) : null}
    </div>
  );
}
