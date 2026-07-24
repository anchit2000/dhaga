import { getSubscriptionForUser } from "./repo";
import { createCheckoutUrl, createPortalUrl } from "./checkout";
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

export async function hasUnlimitedAi(userId: string): Promise<boolean> {
  return isUnlimitedAiSub(await getSubscriptionForUser(userId));
}

export async function getPlanSummary(userId: string) {
  // Hosted mode can run admin/early-access without billing (e.g. a free
  // beta) — no Stripe keys means no billing UI at all, not a broken one.
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const sub = await getSubscriptionForUser(userId);
  return {
    plan: (sub?.plan ?? "free") as "free" | "pro" | "lifetime",
    status: sub?.status ?? null,
    hasStripeCustomer: Boolean(sub?.stripeCustomerId),
  };
}

export const billingGate = {
  hasUnlimitedAi,
  getPlanSummary,
  createCheckoutUrl,
  createPortalUrl,
};

export { handleStripeWebhook } from "./webhook";
