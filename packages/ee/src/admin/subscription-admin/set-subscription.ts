import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../../db/pool";
import { ensureEeSchema } from "../../db/bootstrap";
import { getStripe } from "../../billing/stripe-client";
import { cancelSubscription } from "../../billing/razorpay/client";
import { isTierDowngrade } from "../../billing/plan-change";
import { approveUser } from "../../approval/repo";
import { subscriptions, type SubscriptionPlan, type SubscriptionRow } from "../../db/schema";
import { ADMIN_DOWNGRADE_REJECTION, canAdminDowngrade } from "./downgrade-rule";

/** subscriptions carries no RLS — a plain pool connection is enough. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export interface SetSubscriptionInput {
  plan: "free" | "pro" | "power";
  expiry: Date | null;
}

function planOf(existing: SubscriptionRow | undefined): "free" | SubscriptionPlan {
  if (!existing) return "free";
  return existing.plan === "power" ? "power" : "pro";
}

/**
 * An admin may raise a tier freely, and may lower one only where they granted
 * it — see canAdminDowngrade in ./downgrade-rule. Enforced HERE, not just in
 * the UI: the form is a client component and the action is reachable with any
 * payload, so this is the check that decides.
 */
function assertAdminMayApply(existing: SubscriptionRow | undefined, next: "free" | SubscriptionPlan): void {
  if (!isTierDowngrade(planOf(existing), next)) return;
  if (!canAdminDowngrade(existing ?? null)) throw new Error(ADMIN_DOWNGRADE_REJECTION);
}

/**
 * Admin-managed subscription writer (no processor checkout involved).
 *  - `free` → delete the row so entitlement (hasUnlimitedAi / getPlanSummary)
 *    falls back to free tier.
 *  - `pro` | `power` → upsert an active comp subscription with the given
 *    expiry. An existing row keeps its id and processor ids (the `set` values
 *    omit those columns); a brand-new comp row uses an `admin-granted:<userId>`
 *    sentinel to fill stripeCustomerId and a null stripeSubscriptionId — the
 *    pair canAdminDowngrade reads to tell a comp from a paying customer.
 *
 * Mirrors upsertSubscription's advisory-lock + select-then-write so an admin
 * change can't race a Stripe webhook for the same user.
 *
 * `free`: a row with a REAL processor subscription id must be cancelled at that
 * processor before it's forgotten, or Stripe/Razorpay keeps billing a customer
 * our DB no longer remembers. Only reachable for a subscription that is no
 * longer in a paying state (canAdminDowngrade blocks the rest), which is
 * exactly the incomplete/abandoned case worth tidying. The processor calls run
 * OUTSIDE the advisory lock: holding a transaction-scoped Postgres lock across
 * a network round-trip would block every other write for this user for as long
 * as the processor takes to respond. Genuine errors propagate — the admin
 * should see the action failed, not believe it succeeded while the user is
 * still billed.
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
    assertAdminMayApply(existing, "free");
    if (existing?.stripeSubscriptionId) {
      await getStripe().subscriptions.cancel(existing.stripeSubscriptionId);
    }
    if (existing?.razorpaySubscriptionId) {
      await cancelSubscription(existing.razorpaySubscriptionId);
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
    // Re-checked under the lock, so a concurrent write can't slip a paying
    // subscription in between the read and the update.
    assertAdminMayApply(existing, input.plan);

    const values = {
      plan: input.plan,
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

  // A comp is an admin saying "this person is in", so it also clears the
  // pending-approval gate (see ../../approval). Outside the transaction: the
  // grant is a separate, idempotent statement on a different table, and it must
  // not extend the advisory lock. Demoting to `free` deliberately does NOT
  // revoke — only a refund or chargeback does.
  await approveUser(userId);
}
