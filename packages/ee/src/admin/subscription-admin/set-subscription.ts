import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../../db/pool";
import { ensureEeSchema } from "../../db/bootstrap";
import { getStripe } from "../../billing/stripe-client";
import { subscriptions, type SubscriptionPlan } from "../../db/schema";

/** subscriptions carries no RLS — a plain pool connection is enough. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export interface SetSubscriptionInput {
  plan: "free" | "pro" | "lifetime";
  expiry: Date | null;
}

/**
 * Admin-managed subscription writer (no Stripe involved).
 *  - `free` → delete the row so entitlement (hasUnlimitedAi / getPlanSummary)
 *    falls back to free tier.
 *  - `pro` | `lifetime` → upsert an active comp subscription with the given
 *    expiry. An existing row keeps its id/stripeCustomerId/stripeSubscriptionId
 *    (the `set` values omit those columns); a brand-new comp row uses an
 *    `admin-granted:<userId>` sentinel to satisfy the NOT NULL stripeCustomerId
 *    and a null stripeSubscriptionId.
 *
 * Mirrors upsertSubscription's advisory-lock + select-then-write so an admin
 * change can't race a Stripe webhook for the same user.
 *
 * `free`: a row with a REAL `stripeSubscriptionId` must be canceled in Stripe
 * before it's forgotten, or Stripe keeps billing a customer our DB no longer
 * remembers. The `admin-granted:<userId>` comp-subscription sentinel always
 * has a null `stripeSubscriptionId` (see below), so checking it for truthiness
 * is sufficient — no sentinel-string parsing needed. The Stripe call runs
 * OUTSIDE the advisory lock: it's a network round-trip, and holding a
 * transaction-scoped Postgres lock across one would block every other write
 * for this user for as long as Stripe takes to respond. Genuine Stripe errors
 * propagate — the admin should see the action failed, not believe it
 * succeeded while the user is still billed.
 */
export async function setSubscriptionForUser(
  userId: string,
  input: SetSubscriptionInput,
): Promise<void> {
  const conn = await db();

  if (input.plan === "free") {
    const [existing] = await conn
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    if (existing?.stripeSubscriptionId) {
      await getStripe().subscriptions.cancel(existing.stripeSubscriptionId);
    }
    if (existing) {
      await conn.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
        await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
      });
    }
    return;
  }

  await conn.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));

    const values = {
      plan: input.plan as SubscriptionPlan,
      status: "active" as const,
      currentPeriodEnd: input.expiry,
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    };
    if (existing) {
      await tx.update(subscriptions).set(values).where(eq(subscriptions.userId, userId));
    } else {
      await tx.insert(subscriptions).values({
        id: randomUUID(),
        userId,
        stripeCustomerId: `admin-granted:${userId}`,
        stripeSubscriptionId: null,
        ...values,
      });
    }
  });
}
