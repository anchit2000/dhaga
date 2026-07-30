import type { AiAllowancePlan } from "@/utils/constants/ai-budget";

/**
 * An instance-wide promotional allowance — "everyone gets 1000 credits this
 * month". It REPLACES the plan/env ceiling for the window it covers and then
 * stops applying on its own: expiry is a stored timestamp compared against
 * `now()` at read time, so nobody has to remember to undo it.
 */
export interface AiPromotion {
  credits: number;
  /** ISO timestamps. `endsAt` is exclusive — the promotion is over at that instant. */
  startsAt: string;
  endsAt: string;
  /** Why it's running, shown in the admin panel. */
  note: string;
}

/** Admin overrides of `DEFAULT_AI_PLAN_ALLOWANCES`. Absent key = use the default;
 *  `null` = no ceiling for that plan. */
export type AiPlanAllowances = Partial<Record<AiAllowancePlan, number | null>>;

/** One row of the additive make-good ledger. `userId` null = every user. */
export interface AiCreditGrant {
  id: string;
  userId: string | null;
  credits: number;
  reason: string;
  grantedBy: string;
  startsAt: Date;
  endsAt: Date | null;
  createdAt: Date;
}

/** Everything the admin AI-credits screen and the cap resolver need, in one read. */
export interface AiBudgetConfig {
  enforcePlanCaps: boolean;
  allowances: AiPlanAllowances;
  /** The stored promotion, running or not. */
  promotion: AiPromotion | null;
  /** Credits of the promotion in force AT READ TIME, else null. Evaluated here
   *  rather than by the caller so the window is compared in one place — and so
   *  no component has to read a clock during render. */
  promotionCredits: number | null;
}
