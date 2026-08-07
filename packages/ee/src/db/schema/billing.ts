import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  // Nullable since the Razorpay path: a row is now identified by whichever
  // processor's ids it carries. Stripe rows always set stripeCustomerId;
  // Razorpay rows always set razorpayPaymentId and leave the Stripe ids null.
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  // The recurring Razorpay Subscription that re-charges on its own. Mirrors
  // stripeSubscriptionId, and is what webhook events key on. Every plan is
  // recurring — there is no one-time purchase, so no order id to store.
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  /** Most recent captured payment, on either path. Superseded as the record of
   *  what was charged by the `payments` ledger below — kept because
   *  activeSubscriptionRef-era rows still carry it and the ledger backfill
   *  seeds itself from it. */
  razorpayPaymentId: text("razorpay_payment_id"),
  plan: text("plan").notNull(), // 'pro' | 'power'
  status: text("status").notNull(), // 'active' | 'past_due' | 'canceled' | 'incomplete'
  // REVERSED DECISION: cadence and any scheduled change used to be deliberately
  // NOT stored, on the reasoning that the processor's price/plan object is the
  // only non-drifting copy. That is true, and it is exactly what made every
  // entitlement check (currentPlan → getPlanSummary → describePlan) a live
  // Stripe/Razorpay round-trip — latency and a rate limit on the hot path, and a
  // processor outage degrading unrelated features. These columns are the
  // denormalised copy that makes the read DB-only. The webhooks write them, and
  // `syncedAt` records when a processor last confirmed them so drift is visible
  // rather than silent (see billing/plan-change/state.ts).
  cadence: text("cadence"), // 'monthly' | 'yearly' | 'founding_yearly' | null when never synced
  scheduledPlan: text("scheduled_plan"),
  scheduledCadence: text("scheduled_cadence"),
  scheduledChangeAt: timestamp("scheduled_change_at", { withTimezone: true }),
  /** Last time a processor confirmed the four columns above. Null = never. */
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionPlan = "pro" | "power";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete";

/**
 * One row per claimed Founding Pro seat — the whole enforcement mechanism for
 * a scarcity claim the pricing page makes in public.
 *
 * A seat could not be counted off `subscriptions` instead: that row is written
 * only once a payment is confirmed, so two buyers checking out at seat 500
 * would both pass the count and both be charged. The seat is therefore claimed
 * at CHECKOUT INTENT, and `seat_no` is UNIQUE so the claim is decided by the
 * index rather than by a read-then-write both racers would win (see
 * billing/founding/repo.ts).
 *
 * The trade that buys: an abandoned checkout holds a seat forever, so the offer
 * can sell FEWER than the cap. That is the right direction to be wrong in — the
 * alternative oversells a promise made on a public page — and the shortfall is
 * visible as founding_seats rows with no matching subscription.
 */
export const foundingSeats = pgTable("founding_seats", {
  userId: text("user_id").primaryKey(),
  seatNo: integer("seat_no").notNull().unique(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FoundingSeatRow = typeof foundingSeats.$inferSelect;

/**
 * One row per CHARGE, on either processor — the payment ledger.
 *
 * `subscriptions.razorpayPaymentId` was a single scalar overwritten every
 * renewal: the latest payment and nothing else, so there was no history, no
 * receipts, no per-charge refund resolution, and nothing to reconcile against a
 * processor settlement report. This table is that record.
 *
 * `processorPaymentId` is UNIQUE, and that index IS the idempotency mechanism:
 * both processors deliver webhooks at-least-once, and the confirm path can race
 * the webhook, so every writer inserts with ON CONFLICT … DO UPDATE rather than
 * hand-rolling a read-then-write dedupe (see billing/payments/repo.ts).
 *
 * Money is INTEGER minor units (paise/cents) — never a float, never a numeric
 * read back as a string. Nullable, and so is `currency`, because a row can be
 * recorded before its amount is known (the backfill from the old scalar, or a
 * confirm whose payment fetch failed); null means "we never learned it", which
 * is the honest answer and distinguishable from a genuine zero.
 */
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  processor: text("processor").notNull(), // 'stripe' | 'razorpay'
  processorPaymentId: text("processor_payment_id").notNull().unique(),
  processorSubscriptionId: text("processor_subscription_id"),
  amountMinor: integer("amount_minor"),
  currency: text("currency"),
  status: text("status").notNull(), // see PaymentStatus
  /** The (tier, cadence) this charge bought, as at the moment it was charged —
   *  not the account's plan today, which a later change would have moved. */
  plan: text("plan"),
  cadence: text("cadence"),
  /** The PROCESSOR's timestamp for when the charge occurred, which is what a
   *  settlement report reconciles against. `createdAt` is only when we heard. */
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PaymentRow = typeof payments.$inferSelect;
export type PaymentProcessor = "stripe" | "razorpay";
export type PaymentStatus =
  | "captured"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "failed";
