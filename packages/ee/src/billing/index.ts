import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getSubscriptionForUser } from "./repo";
import { createCheckoutUrl, createPortalUrl } from "./checkout";
import { razorpayEnabled } from "./razorpay";
import type { SubscriptionRow } from "../db/schema";

/**
 * Pure entitlement predicate: a subscription grants unlimited AI only while it
 * is active, on a paid plan, and not past its expiry. `currentPeriodEnd` may be
 * set by Stripe (the paid renewal boundary) or by an admin (a manual comp that
 * should lapse) — either way, once it's in the past the entitlement is gone.
 * Split out from the DB read (and taking `now`) so the expiry logic is unit-
 * testable without a database.
 */
export function isUnlimitedAiSub(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.plan !== "pro" && sub.plan !== "lifetime") return false;
  return sub.currentPeriodEnd === null || sub.currentPeriodEnd > now;
}

export async function hasUnlimitedAi(userId: string, db?: NodePgDatabase): Promise<boolean> {
  return isUnlimitedAiSub(await getSubscriptionForUser(userId, db));
}

export async function getPlanSummary(userId: string) {
  // Hosted mode can run admin/early-access without billing (e.g. a free
  // beta) — no processor configured means no billing UI at all, not a broken
  // one. An instance may sell through either processor or both, so this asks
  // "is anything for sale here", not "is Stripe configured".
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  if (!stripeEnabled && !razorpayEnabled()) return null;
  const sub = await getSubscriptionForUser(userId);
  return {
    plan: (sub?.plan ?? "free") as "free" | "pro" | "lifetime",
    status: sub?.status ?? null,
    hasStripeCustomer: Boolean(sub?.stripeCustomerId),
    stripeEnabled,
    // Drives whether the INR button renders. The Stripe portal/checkout
    // buttons stay keyed off stripeEnabled, so an instance selling only
    // through Razorpay never shows a Stripe control that would throw.
    razorpayEnabled: razorpayEnabled(),
  };
}

export const billingGate = {
  hasUnlimitedAi,
  getPlanSummary,
  createCheckoutUrl,
  createPortalUrl,
};

export { handleStripeWebhook } from "./webhook";
export {
  confirmRazorpayPayment,
  createRazorpayOrder,
  razorpayEnabled,
  type ConfirmFailure,
  type ConfirmResult,
  type RazorpayOrderForCheckout,
} from "./razorpay";
