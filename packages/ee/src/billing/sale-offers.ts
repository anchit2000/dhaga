import { availableCombinations } from "./catalog";
// From ./razorpay/config and ./stripe-client directly rather than the barrels,
// for the same cycle-avoidance reason ./founding gives: the barrels re-export
// checkout, which reaches back into this side of the package.
import { razorpayEnabled } from "./razorpay/config";
import { stripeEnabled } from "./stripe-client";
import type { PlanSelection } from "./catalog";

export interface SaleOffers {
  stripe: PlanSelection[];
  razorpay: PlanSelection[];
}

/**
 * The same `offers` map getPlanSummary builds, minus the subscription read —
 * pure config, so a page with NO USER can ask it.
 *
 * That is the whole reason it exists: the public /pricing page has to know
 * which processor would actually take the money before it can decide which
 * currency it is quoting and which one it must label as an approximate
 * conversion. Routing it through the same `availableCombinations` the settings
 * picker uses means the marketing page and the in-app picker cannot end up
 * naming different currencies for the same instance.
 *
 * Its own module rather than a function in ./index because that file is at the
 * 150-line ceiling.
 */
export async function getSaleOffers(): Promise<SaleOffers> {
  return {
    stripe: stripeEnabled() ? availableCombinations("stripe") : [],
    razorpay: razorpayEnabled() ? availableCombinations("razorpay") : [],
  };
}
