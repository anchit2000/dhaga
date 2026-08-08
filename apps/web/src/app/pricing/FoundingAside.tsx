import Link from "next/link";

import { Button } from "@/components/ui/button";
import styles from "./PricingCards.module.css";
import { formatPrice } from "@/utils/constants/pricing";
import { FOUNDING_PRO_OFFER } from "@/utils/constants/landing";
import type { FoundingOffer } from "@/lib/hosted/gate";
import type { ReactElement } from "react";

/**
 * Founding Pro, when it is still on sale.
 *
 * NO LIVE SEAT COUNT. The page used to print "{seatsRemaining} of the first
 * {seatCap} seats left", which on day one reads "500 of the first 500 seats
 * left" — an announcement that nobody has bought anything. The static cap is a
 * real scarcity claim and leaks nothing, so it stays; the position in the queue
 * is admin-only now (/app/admin). Sell-out is still visible, just not counted
 * down to: getFoundingOffer returns null and this whole aside disappears.
 *
 * Quoted in rupees regardless of the currency toggle, because rupees is the
 * only currency it can be bought in — one Razorpay plan, no Stripe price.
 */
export function FoundingAside({ offer }: { offer: FoundingOffer }): ReactElement {
  return (
    <aside
      className={`mt-6 flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between ${styles.founding}`}
    >
      <div>
        <p className="font-display text-xl">
          Founding Pro · {formatPrice("INR", FOUNDING_PRO_OFFER.price)} a year
        </p>
        <p className="mt-1 text-sm text-fog">
          One of the first {offer.seatCap} Pro seats, saving{" "}
          {formatPrice("INR", FOUNDING_PRO_OFFER.savings)} against the standard{" "}
          {formatPrice("INR", FOUNDING_PRO_OFFER.standardYearlyPrice)} year — and
          it renews at {formatPrice("INR", FOUNDING_PRO_OFFER.price)}, not the
          standard price, for as long as the subscription stays active. Billed in
          rupees through Razorpay.
        </p>
      </div>
      <Button
        render={<Link href="/signup" />}
        variant="link"
        className="min-h-11 justify-start px-0 text-ember"
      >
        Claim a founding seat →
      </Button>
    </aside>
  );
}
