/**
 * The shape of the Razorpay webhook payloads this integration reads, declared
 * locally rather than pulled from the SDK for the same reason ./client declares
 * its own subscription type: the SDK must stay swappable for plain fetch.
 *
 * Split out of ./webhook per the 150-line rule.
 */
export type Notes = Record<string, string | number | null> | null | undefined;

export interface SubscriptionEntity {
  id: string;
  status: string;
  plan_id?: string;
  /** Start of the paid period — the closest thing the event carries to "when
   *  the charge happened", which is what the ledger reconciles against. */
  current_start?: number | null;
  current_end?: number | null;
  has_scheduled_changes?: boolean;
  change_scheduled_at?: number | null;
  notes?: Notes;
}

export interface PaymentEntity {
  id?: string;
  /** Paise. Integer minor units, straight into the ledger. */
  amount?: number;
  currency?: string;
  notes?: Notes;
}

export interface RefundEntity {
  payment_id?: string;
  amount?: number;
}

export interface RazorpayEvent {
  event?: string;
  payload?: {
    subscription?: { entity?: SubscriptionEntity };
    payment?: { entity?: PaymentEntity };
    refund?: { entity?: RefundEntity };
  };
}

export function userIdFrom(notes: Notes): string | null {
  const value = notes?.userId;
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/** The payment a money-back event is about. The refund entity names it
 *  explicitly; a dispute event carries only the payment itself. */
export function paymentIdFrom(event: RazorpayEvent): string | null {
  return event.payload?.refund?.entity?.payment_id ?? event.payload?.payment?.entity?.id ?? null;
}
