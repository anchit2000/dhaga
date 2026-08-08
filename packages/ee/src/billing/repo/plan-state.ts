import type { SubscriptionPlan } from "../../db/schema";
import type { BillingCadence } from "../catalog";

/** The booked-but-not-yet-applied plan change, denormalised onto the row. Null
 *  clears it — which is exactly what "the processor no longer reports a
 *  schedule" has to mean. */
export interface ScheduledChangeFields {
  plan: SubscriptionPlan | null;
  cadence: BillingCadence | null;
  changeAt: Date | null;
}

/**
 * The denormalised plan state, as any writer supplies it.
 *
 * Absent (`undefined`) always means "the caller never learned this" and leaves
 * the stored value alone — blanking `cadence` would un-denormalise the row and
 * send the plan surface back to the processor, which is the round-trip these
 * columns exist to remove. `scheduled: null` is the one explicit clear.
 */
export interface PlanStateFields {
  cadence?: BillingCadence | null;
  scheduled?: ScheduledChangeFields | null;
  /** Stamped only when a PROCESSOR confirmed the values, never when we guessed
   *  — otherwise it would claim a confirmation that never happened. */
  syncedAt?: Date;
}

export function planStateColumns(fields: PlanStateFields) {
  return {
    ...(fields.cadence ? { cadence: fields.cadence } : {}),
    ...(fields.scheduled !== undefined
      ? {
          scheduledPlan: fields.scheduled?.plan ?? null,
          scheduledCadence: fields.scheduled?.cadence ?? null,
          scheduledChangeAt: fields.scheduled?.changeAt ?? null,
        }
      : {}),
    ...(fields.syncedAt ? { syncedAt: fields.syncedAt } : {}),
  };
}
