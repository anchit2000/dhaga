import type { BillingCadence } from "../catalog";
import type { PaymentProcessor, PaymentStatus, SubscriptionPlan } from "../../db/schema";

/**
 * What a webhook (or the Razorpay browser-confirm path) knows about one charge.
 *
 * Every field except the four identity ones is optional because the writers
 * genuinely know different amounts: a Stripe `charge.succeeded` carries the
 * money, a Razorpay confirm may not if the payment fetch failed, and the
 * pre-ledger backfill knows only that a charge happened. A recorded row with a
 * null amount is honest; a fabricated zero would corrupt the reconciliation this
 * ledger exists for.
 */
export interface RecordPaymentInput {
  userId: string;
  processor: PaymentProcessor;
  processorPaymentId: string;
  status: PaymentStatus;
  processorSubscriptionId?: string | null;
  /** Minor units — paise or cents. Integer, never a float or decimal string. */
  amountMinor?: number | null;
  /** ISO 4217, as the processor reported it. */
  currency?: string | null;
  plan?: SubscriptionPlan | null;
  cadence?: BillingCadence | null;
  /** The PROCESSOR's timestamp for the charge — what a settlement report
   *  reconciles against. Defaults to now() only because some events omit it. */
  occurredAt?: Date | null;
}

/** A money-back event: the ledger row moves to this status and its owner is
 *  returned so the approval side can act on a real account id. */
export interface PaymentOutcomeInput {
  processor: PaymentProcessor;
  processorPaymentId: string;
  status: Extract<PaymentStatus, "refunded" | "partially_refunded" | "disputed">;
}
