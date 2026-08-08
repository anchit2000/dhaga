import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eeUser, subscriptions, type SubscriptionRow } from "../../db/schema";
import { billingDb } from "./connection";

export async function getSubscriptionForUser(
  userId: string,
  scopedDb?: NodePgDatabase,
): Promise<SubscriptionRow | null> {
  // Reuse the request's already-checked-out scoped connection when the caller
  // passes one (the AI-metering hot path) instead of opening a second checkout
  // from the small tenant pool — that second acquire is what times out under
  // load. `subscriptions` has NO RLS (db/tables-ddl) and filters by explicit
  // userId, so a scoped connection reads it exactly like the global one. Falls
  // back to billingDb() (which ensures the EE schema) when no connection is
  // passed (e.g. getPlanSummary).
  const conn = scopedDb ?? (await billingDb());
  const [row] = await conn.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row ?? null;
}

export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await (await billingDb())
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
  return row ?? null;
}

/** A Stripe `charge.*` event names a customer, not a subscription — this is how
 *  the payment-ledger writer resolves which account (and which tier) a charge
 *  belongs to without trusting anything on the event itself. */
export async function getSubscriptionByStripeCustomerId(
  stripeCustomerId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await (await billingDb())
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
  return row ?? null;
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const [row] = await (await billingDb())
    .select({ email: eeUser.email })
    .from(eeUser)
    .where(eq(eeUser.id, userId));
  return row?.email ?? null;
}
