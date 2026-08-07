"use client";

import { Button } from "@/components/ui/button";
import styles from "./PricingCards.module.css";
import { useDisplayCurrency } from "./currency-context";
import { CURRENCIES, CURRENCY_NAME, CURRENCY_SYMBOL } from "@/utils/constants/pricing";
import type { ReactElement } from "react";

/**
 * INR ↔ USD on the marketing cards.
 *
 * The caveat under it is the point of the component, not decoration: while
 * Razorpay is the only live processor, every plan is billed in rupees whatever
 * this toggle says, so the other currency must read as a conversion rather than
 * a price. When the visitor is looking at the currency they will actually be
 * charged in, `charging` matches the selection and the caveat stops rendering
 * on its own — no copy needs rewriting the day Stripe comes back.
 */
export function CurrencyToggle(): ReactElement {
  const { currency: value, charging, select } = useDisplayCurrency();
  const approximate = charging !== null && charging !== value;

  return (
    <div className="mt-6">
      <div
        className={`inline-flex rounded-full border p-1 ${styles.toggle}`}
        role="group"
        aria-label="Display currency"
      >
        {CURRENCIES.map((currency) => (
          <Button
            key={currency}
            aria-pressed={currency === value}
            aria-label={CURRENCY_NAME[currency]}
            onClick={() => select(currency)}
            variant="ghost"
            className={`min-h-11 px-5 text-sm ${currency === value ? styles.activeToggle : ""}`}
          >
            {CURRENCY_SYMBOL[currency]} {currency}
          </Button>
        ))}
      </div>
      {approximate ? (
        <p className="mt-3 max-w-xl text-sm text-fog">
          {CURRENCY_SYMBOL[value]} figures are an approximate conversion, shown
          for comparison. Every plan is charged in {CURRENCY_NAME[charging]} —
          checkout and your statement show the {CURRENCY_SYMBOL[charging]}{" "}
          amount.
        </p>
      ) : null}
    </div>
  );
}
