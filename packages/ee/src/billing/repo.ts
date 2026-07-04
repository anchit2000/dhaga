import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../db/pool";
import { ensureEeSchema } from "../db/bootstrap";
import { eeUser, subscriptions, type SubscriptionRow, type SubscriptionPlan, type SubscriptionStatus } from "../db/schema";

async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRow | null> {
  const [row] = await (await db()).select().from(subscriptions).where(eq(subscriptions.userId, userId));
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

/** Keyed by userId (unique) — one subscription row per account. */
export async function upsertSubscription(input: UpsertInput): Promise<void> {
  const conn = await db();
  const existing = await getSubscriptionForUser(input.userId);
  const values = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    plan: input.plan,
    status: input.status,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    updatedAt: new Date(),
  };
  if (existing) {
    await conn.update(subscriptions).set(values).where(eq(subscriptions.userId, input.userId));
  } else {
    await conn.insert(subscriptions).values({ id: randomUUID(), userId: input.userId, ...values });
  }
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
