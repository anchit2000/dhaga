import { getSubscriptionForUser } from "./repo";
import { createCheckoutUrl, createPortalUrl } from "./checkout";

export async function hasUnlimitedAi(userId: string): Promise<boolean> {
  const sub = await getSubscriptionForUser(userId);
  if (!sub) return false;
  return sub.status === "active" && (sub.plan === "pro" || sub.plan === "lifetime");
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
