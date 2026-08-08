import type { Currency } from "@/utils/constants/pricing";
import type { PlanOffer } from "@/lib/hosted/gate";
import type { Processor } from "@/lib/billing/processor";

/**
 * Which processor will ACTUALLY take the money, and therefore which currency
 * the price cards must quote.
 *
 * preferredProcessor() answers a different question — which button leads, from
 * the request's country — and it must not decide currency on its own. On an
 * instance selling through Razorpay only, a visitor outside India resolves to
 * `stripe`, so a geo-derived currency would render $96 above the one button
 * that renders, which charges ₹8,499. Quoting one currency and charging
 * another is the failure this exists to prevent.
 *
 * So: the geo-preferred processor if it has configured offers, otherwise the
 * other one if it does. Null when neither can sell anything — the caller then
 * renders no pricing at all rather than prices nobody can act on.
 */
export function chargingProcessor(
  offers: { stripe: PlanOffer[]; razorpay: PlanOffer[] },
  preferred: Processor,
): Processor | null {
  if (offers[preferred].length > 0) return preferred;
  const other: Processor = preferred === "razorpay" ? "stripe" : "razorpay";
  return offers[other].length > 0 ? other : null;
}

/** One resolved currency for the whole surface, so two tier cards can never
 *  render in different currencies. */
export function currencyFor(processor: Processor): Currency {
  return processor === "razorpay" ? "INR" : "USD";
}
