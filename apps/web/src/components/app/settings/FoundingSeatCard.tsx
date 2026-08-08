import { RazorpayCheckoutButton } from "@/components/app/settings/RazorpayCheckoutButton";
import { PRO_FOUNDING_PRICE, formatPrice } from "@/utils/constants/pricing";
import type { FoundingOffer } from "@/lib/hosted/gate";
import type { ReactElement } from "react";

/**
 * The Founding Pro claim, shared by /pending and the settings plan surface so
 * the two can't drift on price or wording.
 *
 * It renews at the founding price rather than stepping up (BRD §11 Q6, resolved
 * 2026-08): a Razorpay Plan charges the same amount every cycle, so ₹6,999 is
 * what every renewal costs with no dashboard change needed. The copy still says
 * nothing about what someone who CANCELS and comes back later pays — no code
 * decides that today, and inventing an answer is the failure this comment
 * originally guarded against.
 *
 * Rendered only when the gate returned an offer — i.e. Razorpay is configured,
 * the plan id is set, and seats remain. HOW MANY remain is not shown: at 500 of
 * 500 it advertises that nobody has bought anything, and it was never
 * trustworthy anyway — the real decision is the atomic claim EE makes when the
 * checkout is created, which is why a sold-out click gets its own message from
 * /api/razorpay/order rather than being prevented in the browser. Admins read
 * claimed-vs-cap on /app/admin.
 *
 * INR only — there is no Stripe price for a founding seat (see
 * PRO_FOUNDING_PRICE), so this never renders a USD button.
 */
export function FoundingSeatCard({ offer }: { offer: FoundingOffer }): ReactElement {
  const price = PRO_FOUNDING_PRICE.INR;
  return (
    <div className="rounded-xl border border-seam bg-panel/60 p-4">
      <p className="text-sm font-medium text-paper">Founding Pro · a year</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-xl text-paper">{formatPrice("INR", price.amount)}</span>
        {price.originalAmount ? (
          <span className="text-sm text-fog line-through">
            {formatPrice("INR", price.originalAmount)}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-fog">
        One of the first {offer.seatCap} seats — a year of Pro billed in rupees
        through Razorpay, and it renews at {formatPrice("INR", price.amount)} for
        as long as your subscription stays active.
      </p>
      <div className="mt-3">
        <RazorpayCheckoutButton
          selection={{ plan: offer.plan, cadence: offer.cadence }}
          label="Claim a founding seat — INR"
        />
      </div>
    </div>
  );
}
