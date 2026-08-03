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

/**
 * The instance-wide default ceiling — what a user no plan governs gets — plus
 * WHERE it came from, so the admin screen can name the live number instead of
 * leaving an operator to guess between the database and `DHAGA_AI_MONTHLY_CAP`.
 * `credits: null` = no ceiling. Resolved by `instanceDefaultCap` in
 * lib/ai/metering/cap/instance-default.ts.
 */
export type AiCapDefaultSource = "admin" | "env" | "shipped";

export interface AiCapDefault {
  credits: number | null;
  source: AiCapDefaultSource;
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
  /** The master cost gate — a per-user monthly ceiling in real inference
   *  DOLLARS, independent of the credit ladder above. Read from the same single
   *  `ai_budget_settings` query, so it costs no extra round-trip. */
  dollarCap: AiDollarCapConfig;
}

/** The instance-wide knobs behind the dollar ceiling. */
export interface AiDollarCapConfig {
  enforced: boolean;
  /** Plan monthly revenue × this = that plan's ceiling. */
  multiplier: number;
  /** USD ceiling for plans with no recurring revenue (free), where a multiple
   *  of $0 would refuse every action. */
  floorUsd: number;
}

/** The dollar ceiling actually in force for one user, and which rung set it —
 *  so the admin screen can explain a number instead of just printing it. */
export type AiDollarCeilingSource = "override" | "plan" | "floor" | "unset";

export interface AiDollarCeiling {
  /** USD per month. `null` = no dollar ceiling applies to this user. */
  usd: number | null;
  source: AiDollarCeilingSource;
}

/** One 0-credit feature's real dollar cost — the blind spot the master gate
 *  exists to close, shown apart from credited spend rather than folded into it. */
export interface AiUncreditedFeatureCost {
  feature: string;
  label: string;
  actions: number;
  usd: number;
}

/** One user's month on the admin cost screen. */
export interface AiUserCostRow {
  userId: string;
  email: string;
  plan: string;
  usd: number;
  credits: number;
  /** The dollar ceiling in force for them, and which rung set it. */
  ceiling: AiDollarCeiling;
  /** `usd / ceiling.usd` as a percentage; null when no ceiling applies. */
  utilisationPct: number | null;
}

/** Everything the admin cost card renders, from one cross-tenant read. */
export interface AiCostSummary {
  totalUsd: number;
  creditedUsd: number;
  uncreditedUsd: number;
  totalCredits: number;
  totalActions: number;
  /** Credited dollars ÷ credited credits — what a credit MEASURABLY costs,
   *  to sit beside the ~$0.006 blended ceiling the credit table assumed. Null
   *  when no credited action has run this month. */
  measuredUsdPerCredit: number | null;
  /** The same figure with uncredited spend folded back in: what a credit costs
   *  once the free riders are paid for out of credited revenue. */
  allInUsdPerCredit: number | null;
  uncreditedFeatures: AiUncreditedFeatureCost[];
  topUsers: AiUserCostRow[];
}

/** One (feature, model, batch) bucket of a month's recorded AI usage. Priced by
 *  lib/ai/cost, which needs exactly `model` + tokens + `batch`. */
export interface AiSpendGroup {
  feature: string;
  model: string;
  batch: boolean;
  inputTokens: number;
  outputTokens: number;
  actions: number;
  /** `actions × the feature's credit price` — 0 for the uncredited features. */
  credits: number;
}
