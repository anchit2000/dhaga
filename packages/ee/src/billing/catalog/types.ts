export type BillingTier = "pro" | "power";

/**
 * `founding_yearly` is a LIMITED FIRST-PURCHASE PRICE on the Pro tier, not a
 * tier of its own: it grants exactly Pro's entitlements and renews yearly, so
 * every tier lookup must resolve it to `pro`.
 *
 * It is modelled as a cadence rather than a separate concept because cadence is
 * already the axis that answers "which processor plan object does this
 * selection map to, and what does it cost" — the subscription row's `cadence`
 * column, the reverse lookups and the payment ledger all carry it end to end
 * with no new plumbing. What it must NOT do is become a rung on the standard
 * ladder, so it is deliberately absent from BILLING_CADENCES: nothing iterates
 * it into a buy grid or a plan-change offer. It is reachable only through the
 * explicit founding path (see ../founding), which is where the seat cap lives.
 */
export type BillingCadence = "monthly" | "yearly" | "founding_yearly";

/** What the buyer picked. Every plan is recurring, so a cadence is always
 *  required — there is no one-time purchase to special-case. */
export interface PlanSelection {
  plan: BillingTier;
  cadence: BillingCadence;
}

export const FOUNDING_CADENCE = "founding_yearly" as const;

export const BILLING_TIERS: readonly BillingTier[] = ["pro", "power"];

/** The STANDARD ladder — what the pickers iterate and what a plan change may
 *  target. Founding is excluded on purpose (see BillingCadence above). */
export const BILLING_CADENCES: readonly BillingCadence[] = ["monthly", "yearly"];

/** Every cadence a stored row or a processor object may legitimately carry.
 *  Reverse lookups use this, so a founding subscription still resolves to a
 *  tier and a cadence; only the SELL/CHANGE surfaces use BILLING_CADENCES. */
export const ALL_BILLING_CADENCES: readonly BillingCadence[] = [
  ...BILLING_CADENCES,
  FOUNDING_CADENCE,
];

export function isFoundingSelection(selection: PlanSelection): boolean {
  return selection.cadence === FOUNDING_CADENCE;
}
