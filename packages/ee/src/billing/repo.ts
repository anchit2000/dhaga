import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { eeUser, subscriptions, type SubscriptionRow, type SubscriptionPlan, type SubscriptionStatus } from "../db/schema";

async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export async function getSubscriptionForUser(
  userId: string,
  scopedDb?: NodePgDatabase,
): Promise<SubscriptionRow | null> {
  // Reuse the request's already-checked-out scoped connection when the caller
  // passes one (the AI-metering hot path) instead of opening a second checkout
  // from the small tenant pool — that second acquire is what times out under
  // load. `subscriptions` has NO RLS (tables-ddl.ts) and filters by explicit
  // userId, so a scoped connection reads it exactly like the global one. Falls
  // back to db() (which ensures the EE schema) when no connection is passed
  // (e.g. getPlanSummary).
  const conn = scopedDb ?? (await db());
  const [row] = await conn.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  return row ?? null;
}

export async function getSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  const [row] = await (await db())
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
  return row ?? null;
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const [row] = await (await db()).select({ email: eeUser.email }).from(eeUser).where(eq(eeUser.id, userId));
  return row?.email ?? null;
}

interface UpsertInput {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Keyed by userId (unique) — one subscription row per account.
 *
 * Stripe delivers webhooks at-least-once and retries on a slow response, so
 * two calls for the same userId can overlap (the same event redelivered, or
 * two events landing close together). Without serialization, both could see
 * "no existing row" and both attempt an insert — the second throws on the
 * unique constraint and Stripe sees a spurious non-2xx. A transaction-scoped
 * advisory lock keyed on userId forces concurrent calls to run one at a
 * time, same pattern as findOrCreateCompany's company-name lock.
 */
export async function upsertSubscription(input: UpsertInput): Promise<void> {
  const conn = await db();
  const values = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    plan: input.plan,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  };
  await conn.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.userId}))`);
    const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.userId, input.userId));
    if (existing) {
      await tx.update(subscriptions).set(values).where(eq(subscriptions.userId, input.userId));
    } else {
      await tx.insert(subscriptions).values({ id: randomUUID(), userId: input.userId, ...values });
    }
  });
}

export async function updateSubscriptionStatusByStripeId(
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
  fields: Partial<Pick<UpsertInput, "currentPeriodEnd" | "cancelAtPeriodEnd">> = {},
): Promise<void> {
  await (await db())
    .update(subscriptions)
    .set({ status, updatedAt: new Date(), ...fields })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}
