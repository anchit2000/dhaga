import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { subscriptions, type SubscriptionPlan, type SubscriptionStatus } from "../../db/schema";
import type { BillingCadence } from "../catalog";
import { billingDb } from "./connection";
import { planStateColumns, type PlanStateFields, type ScheduledChangeFields } from "./plan-state";

export interface UpsertInput {
  userId: string;
  /** Null on the Razorpay path — that processor has no Stripe customer. */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  razorpaySubscriptionId?: string | null;
  razorpayPaymentId?: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Absent or null both mean "the caller never learned one" and PRESERVE the
   *  stored boundary — see the hazard note on upsertSubscription. */
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  cadence?: BillingCadence | null;
  scheduled?: ScheduledChangeFields | null;
}

/**
 * Keyed by userId (unique) — one subscription row per account.
 *
 * Stripe delivers webhooks at-least-once and retries on a slow response, so
 * two calls for the same userId can overlap (the same event redelivered, or
 * two events landing close together). Without serialization, both could see
 * "no existing row" and both attempt an insert — the second throws on the
 * unique constraint and Stripe sees a spurious non-2xx. A transaction-scoped
 * advisory lock keyed on userId forces concurrent calls to run one at a time,
 * same pattern as findOrCreateCompany's company-name lock.
 *
 * HAZARD, and the reason currentPeriodEnd is OMITTED rather than nulled when
 * the caller has none: isUnlimitedAiSub reads a null currentPeriodEnd as "never
 * expires" (that is how an unbounded admin comp is represented), and Razorpay
 * returns `current_end: null` in the `created` state. Writing that null through
 * would turn an ordinary lifecycle event into a permanent free pass. Only ever
 * narrow the boundary; never erase one we already hold.
 */
export async function upsertSubscription(input: UpsertInput): Promise<void> {
  const conn = await billingDb();
  const values = {
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    razorpaySubscriptionId: input.razorpaySubscriptionId ?? null,
    razorpayPaymentId: input.razorpayPaymentId ?? null,
    plan: input.plan,
    status: input.status,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    ...planStateColumns({
      cadence: input.cadence,
      scheduled: input.scheduled,
      syncedAt: input.cadence ? new Date() : undefined,
    }),
    updatedAt: new Date(),
  };
  await conn.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.userId}))`);
    const [existing] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, input.userId));
    if (existing) {
      await tx
        .update(subscriptions)
        .set({
          ...values,
          ...(input.currentPeriodEnd ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
        })
        .where(eq(subscriptions.userId, input.userId));
    } else {
      await tx.insert(subscriptions).values({
        id: randomUUID(),
        userId: input.userId,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        ...values,
      });
    }
  });
}

/**
 * Narrow writer for the plan-change lifecycle: the row already exists and only
 * a couple of columns move (the tier after an immediate upgrade, the
 * cancel-at-renewal flag, the change this instance just booked). Deliberately
 * NOT upsertSubscription — that one needs every processor id, and passing them
 * again just to flip one boolean risks nulling an id the caller didn't read.
 */
export async function patchSubscriptionForUser(
  userId: string,
  fields: Partial<Pick<UpsertInput, "plan" | "status" | "currentPeriodEnd" | "cancelAtPeriodEnd">> &
    PlanStateFields,
): Promise<void> {
  const { cadence, scheduled, syncedAt, ...rest } = fields;
  await (await billingDb())
    .update(subscriptions)
    .set({ ...rest, ...planStateColumns({ cadence, scheduled, syncedAt }), updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
}

export async function updateSubscriptionStatusByStripeId(
  stripeSubscriptionId: string,
  status: SubscriptionStatus,
  fields: Partial<Pick<UpsertInput, "plan" | "currentPeriodEnd" | "cancelAtPeriodEnd">> &
    PlanStateFields = {},
): Promise<void> {
  const { cadence, scheduled, syncedAt, ...rest } = fields;
  await (await billingDb())
    .update(subscriptions)
    .set({
      status,
      ...rest,
      ...planStateColumns({ cadence, scheduled, syncedAt }),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}
