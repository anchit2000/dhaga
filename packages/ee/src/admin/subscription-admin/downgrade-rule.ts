import type { SubscriptionRow } from "../../db/schema";

/** The message the admin UI shows when the server refuses a downgrade. */
export const ADMIN_DOWNGRADE_REJECTION =
  "This user pays through a live subscription — lower or end it from their own billing settings, or in the processor dashboard. An admin can only change plans they comped.";

/**
 * May an admin LOWER this user's tier (including all the way to free)?
 *
 * Yes for a comp — the plan an admin granted in the first place, so a mis-click
 * stays undoable. No for someone who is actually paying: a plan bought through
 * Stripe or Razorpay must be changed where the money is, otherwise the row and
 * the processor disagree and we keep charging a card for access we just
 * revoked (or strip a paying customer's plan from a page listing every user).
 *
 * The signal is already in the row, no new column needed. A comp is written
 * with the `admin-granted:<userId>` sentinel customer id and NO processor
 * subscription id; a real customer always carries one. `active` and `past_due`
 * are the paying states — `past_due` counts because the processor is still
 * retrying the charge, so the subscription is very much live.
 *
 * A former customer whose subscription is `canceled` (or never completed) has
 * nothing still billing, so an admin may tidy the row up.
 */
export function canAdminDowngrade(sub: SubscriptionRow | null): boolean {
  if (!sub) return true;
  const hasProcessorSubscription = Boolean(sub.stripeSubscriptionId ?? sub.razorpaySubscriptionId);
  const paying = sub.status === "active" || sub.status === "past_due";
  return !(hasProcessorSubscription && paying);
}
