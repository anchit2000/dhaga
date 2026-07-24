import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { getStripe } from "../billing/stripe-client";
import { getSubscriptionForUser } from "../billing/repo";
import { subscriptions, type SubscriptionRow } from "../db/schema";

/**
 * Length of the granted Pro extension, in days. Mirrors REFERRAL_REWARD_DAYS in
 * apps/web/src/utils/constants/referral.ts — packages/ee must not import from
 * apps/web (open-core boundary), so the literal is duplicated. Keep in sync.
 */
const REWARD_DAYS = 30;

/**
 * Env var holding the Stripe coupon id used to give a paying advocate a free
 * month. Mirrors REFERRAL_STRIPE_COUPON_ENV in the same app constants file.
 */
const STRIPE_COUPON_ENV = "STRIPE_REFERRAL_COUPON_ID";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Which mechanism granted a side's reward — recorded on the referral. */
export type RewardKind = "stripe-coupon" | "comp-extend";

/** subscriptions carries no RLS — a plain pool connection is enough. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

/**
 * PURE (now-injectable, no I/O) so it's unit-testable. Additive extension of a
 * comp expiry:
 *  - existing === null → keep null: a never-expiring plan (lifetime, or an
 *    unbounded comp). Setting a dated expiry would DOWNGRADE it.
 *  - otherwise → max(now, existing) + days, so a still-valid month stacks on
 *    top and an already-lapsed one restarts cleanly from now.
 */
export function computeExtendedExpiry(
  existing: Date | null,
  now: Date,
  days: number,
): Date | null {
  if (existing === null) return null;
  const base = existing.getTime() > now.getTime() ? existing.getTime() : now.getTime();
  return new Date(base + days * MS_PER_DAY);
}

/**
 * A LIVE Stripe subscription owns its own current_period_end (Stripe's
 * customer.subscription.updated webhook overwrites it), so its reward must be a
 * Stripe coupon, never an expiry bump. It qualifies only with a real Stripe
 * subscription id and an entitlement-bearing status; comp/admin/referral rows
 * carry a null stripeSubscriptionId and never match.
 */
function isLiveStripeSub(sub: SubscriptionRow | null): boolean {
  if (!sub || !sub.stripeSubscriptionId) return false;
  return sub.status === "active" || sub.status === "past_due";
}

/**
 * Grant one side's free Pro month. A paying (live-Stripe) user gets the Stripe
 * coupon applied to their subscription; everyone else gets an additive comp
 * expiry bump. Returns the mechanism used so the caller can record it.
 */
export async function grantReferralReward(userId: string): Promise<RewardKind> {
  const sub = await getSubscriptionForUser(userId);

  if (sub && sub.stripeSubscriptionId && isLiveStripeSub(sub)) {
    const couponId = process.env[STRIPE_COUPON_ENV];
    if (!couponId) {
      // Fail loud (Rule 12): silently succeeding would hand a paying advocate
      // nothing. The operator must configure the coupon id in Stripe.
      throw new Error(
        `referral reward: ${STRIPE_COUPON_ENV} is not configured — set it to the Stripe coupon id that grants a free month.`,
      );
    }
    // Stripe v19 dropped the top-level `coupon` param; a coupon is applied as a
    // discount. Do NOT touch current_period_end — the webhook would clobber it.
    await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
      discounts: [{ coupon: couponId }],
    });
    return "stripe-coupon";
  }

  // Comp path: additive expiry bump on a plan='pro' comp row. Advisory-locked +
  // select-then-write, mirroring admin setSubscriptionForUser, so a referral
  // grant can't race a Stripe webhook for the same user.
  const now = new Date();
  const conn = await db();
  await conn.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    // No row → start a fresh month from now; a row → extend/preserve its expiry.
    const existingExpiry = existing ? existing.currentPeriodEnd : now;
    const newEnd = computeExtendedExpiry(existingExpiry, now, REWARD_DAYS);
    const values = {
      // Never downgrade a lifetime plan to pro.
      plan: existing?.plan === "lifetime" ? "lifetime" : "pro",
      status: "active" as const,
      currentPeriodEnd: newEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    };
    if (existing) {
      await tx.update(subscriptions).set(values).where(eq(subscriptions.userId, userId));
    } else {
      await tx.insert(subscriptions).values({
        id: randomUUID(),
        userId,
        stripeCustomerId: `referral-granted:${userId}`,
        stripeSubscriptionId: null,
        ...values,
      });
    }
  });
  return "comp-extend";
}
