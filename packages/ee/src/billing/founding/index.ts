import { FOUNDING_CADENCE, foundingPlanConfigured } from "../catalog";
// From ./config, not the ../razorpay barrel: that barrel re-exports
// ./checkout, which imports this module, and the cycle is avoidable.
import { razorpayEnabled } from "../razorpay/config";
import { FOUNDING_SEAT_CAP } from "./cap";
import { claimedSeatCount } from "./repo";

/**
 * Founding Pro: a limited first-purchase price on the Pro tier, sold only
 * through Razorpay (INR). Split per the 150-line rule — ./cap holds the number
 * and the sold-out error, ./repo the atomic seat claim.
 */
export { FOUNDING_SEAT_CAP, FoundingSoldOutError } from "./cap";
export { claimFoundingSeat, claimedSeatCount } from "./repo";

/** What the UI needs to render (or withhold) the offer. `seatsRemaining` is a
 *  HINT — it can be stale by the time a buyer clicks, which is exactly why the
 *  authoritative decision is the seat claim inside checkout, not this. Since
 *  2026-08 no customer-facing surface prints it either: "500 of 500 left"
 *  advertises that nobody has bought. It survives here because it is how this
 *  function decides whether to return an offer at all, and admins see the
 *  claimed total through dashboardCounts. */
export interface FoundingOffer {
  plan: "pro";
  cadence: typeof FOUNDING_CADENCE;
  seatCap: number;
  seatsRemaining: number;
}

/**
 * The offer, or null when it must not be shown: no Razorpay on this instance,
 * no configured plan id, or no seats left. Same rule as availableCombinations —
 * never render a price this instance cannot actually charge.
 *
 * DB-only, and deliberately NOT folded into getPlanSummary: that function is on
 * the entitlement hot path (per AI action, per MCP request) and must stay one
 * indexed read. This is called by the three surfaces that show the offer.
 *
 * A DB failure hides the offer rather than propagating. Fail-closed is right
 * for a scarcity claim: showing a seat we can't confirm exists is worse than
 * showing standard Pro for a few seconds.
 */
export async function getFoundingOffer(): Promise<FoundingOffer | null> {
  if (!razorpayEnabled() || !foundingPlanConfigured()) return null;
  let claimed: number;
  try {
    claimed = await claimedSeatCount();
  } catch (error) {
    console.error("[billing] couldn't read founding seat availability", error);
    return null;
  }
  const seatsRemaining = FOUNDING_SEAT_CAP - claimed;
  if (seatsRemaining <= 0) return null;
  return {
    plan: "pro",
    cadence: FOUNDING_CADENCE,
    seatCap: FOUNDING_SEAT_CAP,
    seatsRemaining,
  };
}
