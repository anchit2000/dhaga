import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { getPool } from "../../db/pool";
import { ensureEeSchema } from "../../db/bootstrap";
import { payments, type PaymentProcessor } from "../../db/schema";
import type { PaymentOutcomeInput, RecordPaymentInput } from "./types";

/** `payments` carries no RLS (tables-ddl/billing.ts) — a plain pool connection
 *  is enough, same as the subscription repo next door. */
async function db() {
  await ensureEeSchema(getPool());
  return drizzle(getPool());
}

/**
 * Records one charge. Safe to call any number of times for the same payment.
 *
 * The UNIQUE index on `processor_payment_id` IS the idempotency mechanism —
 * there is deliberately no read-then-write dedupe, because two concurrent
 * at-least-once deliveries would both read "absent" and both insert. Instead:
 *
 *  - a redelivered event lands on ON CONFLICT and updates,
 *  - a writer that learned MORE than the first one (an amount the confirm path
 *    couldn't fetch, say) fills the gaps via coalesce, and
 *  - a writer that knows LESS never blanks a field we already have.
 *
 * The `setWhere` encodes the one ordering hazard that actually costs money: a
 * `subscription.charged` redelivered AFTER a refund must not flip the row back
 * to `captured` and make the charge look good again. Any other transition is
 * allowed, including failed → captured (a retry that finally settled).
 */
export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  const conn = await db();
  const now = new Date();
  await conn
    .insert(payments)
    .values({
      id: randomUUID(),
      userId: input.userId,
      processor: input.processor,
      processorPaymentId: input.processorPaymentId,
      processorSubscriptionId: input.processorSubscriptionId ?? null,
      amountMinor: input.amountMinor ?? null,
      currency: input.currency ?? null,
      status: input.status,
      plan: input.plan ?? null,
      cadence: input.cadence ?? null,
      // Left NULL when the writer didn't learn the processor's own timestamp,
      // so a later writer that did can fill it in below. `created_at` already
      // records when WE heard; conflating the two would make the ledger claim a
      // charge time it never knew.
      occurredAt: input.occurredAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: payments.processorPaymentId,
      set: {
        status: sql`excluded.status`,
        // Fill in what the first writer didn't know; never overwrite what it
        // did. user_id and processor are identity and are left alone entirely.
        processorSubscriptionId: sql`coalesce(${payments.processorSubscriptionId}, excluded.processor_subscription_id)`,
        amountMinor: sql`coalesce(${payments.amountMinor}, excluded.amount_minor)`,
        currency: sql`coalesce(${payments.currency}, excluded.currency)`,
        plan: sql`coalesce(${payments.plan}, excluded.plan)`,
        cadence: sql`coalesce(${payments.cadence}, excluded.cadence)`,
        occurredAt: sql`coalesce(${payments.occurredAt}, excluded.occurred_at)`,
        updatedAt: now,
      },
      setWhere: sql`not (excluded.status = 'captured' and ${payments.status} in ('refunded', 'partially_refunded', 'disputed'))`,
    });
}

/**
 * Money going back: moves the ledger row and returns WHOSE it was.
 *
 * This is the reason the ledger exists on the approval side. A refund or
 * dispute event names a processor payment, never our user id, and the previous
 * resolution guessed from Razorpay `notes` (unverified — Razorpay is not
 * documented to copy subscription notes onto subscription-charge payments) with
 * a single overwritten scalar as backup. A row per charge answers it directly.
 *
 * Null when this instance has no such payment recorded, which is not an error:
 * a refund for a charge we never saw is not a reason to throw and make the
 * processor retry forever.
 */
export async function applyPaymentOutcome(input: PaymentOutcomeInput): Promise<string | null> {
  const [row] = await (await db())
    .update(payments)
    .set({ status: input.status, updatedAt: new Date() })
    .where(
      and(
        eq(payments.processor, input.processor),
        eq(payments.processorPaymentId, input.processorPaymentId),
      ),
    )
    .returning({ userId: payments.userId });
  return row?.userId ?? null;
}

/** Read-only owner lookup, for callers that must not mutate the row. */
export async function findPaymentUserId(
  processor: PaymentProcessor,
  processorPaymentId: string,
): Promise<string | null> {
  const [row] = await (await db())
    .select({ userId: payments.userId })
    .from(payments)
    .where(
      and(eq(payments.processor, processor), eq(payments.processorPaymentId, processorPaymentId)),
    );
  return row?.userId ?? null;
}
