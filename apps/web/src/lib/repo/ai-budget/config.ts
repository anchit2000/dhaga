import {
  AI_PLAN_ALLOWANCES_KEY,
  AI_PLAN_CAP_ENFORCEMENT_DEFAULT,
  AI_PLAN_CAP_ENFORCEMENT_KEY,
  AI_PROMOTION_KEY,
  AI_ALLOWANCE_PLANS,
  DEFAULT_AI_PLAN_ALLOWANCES,
  type AiAllowancePlan,
} from "@/utils/constants/ai-budget";
import { readDollarCapConfig } from "./dollar-cap";
import { readAll, writeKey } from "./store";
import type { AiBudgetConfig, AiPlanAllowances, AiPromotion } from "@/types";

/**
 * Instance-wide AI budget configuration. Reads and writes `ai_budget_settings`,
 * which carries NO row-level security by design — these are the operator's
 * settings, not a user's (see lib/db/ddl/ai-budget.ts for why putting them in
 * the tenant-scoped `settings` table would fail silently).
 *
 * The table is small, so every read pulls all of it in ONE query (./store.ts)
 * and every parser here works from that map — including the dollar gate's, so
 * the second ceiling costs no second round-trip.
 */

/**
 * THE MASTER SWITCH. ON unless an admin explicitly turns it off (see
 * AI_PLAN_CAP_ENFORCEMENT_DEFAULT). Once a row exists, only the literal "on"
 * reads as on — the value is written by `setPlanCapEnforcement`, so anything
 * else is corruption, and the readable-but-wrong direction to fail is the one
 * that stops enforcing rather than the one that newly refuses a paying customer.
 */
function readEnforcement(values: Map<string, string>): boolean {
  const raw = values.get(AI_PLAN_CAP_ENFORCEMENT_KEY);
  if (raw === undefined) return AI_PLAN_CAP_ENFORCEMENT_DEFAULT;
  return raw === "on";
}

function isAllowanceValue(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}

/** Admin-set overrides only; callers fold in DEFAULT_AI_PLAN_ALLOWANCES via
 *  `resolvePlanAllowance` so an unset plan keeps the constant. A corrupt value
 *  falls back to the constants rather than throwing on the AI hot path. */
function readAllowances(values: Map<string, string>): AiPlanAllowances {
  const raw = values.get(AI_PLAN_ALLOWANCES_KEY);
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  const out: AiPlanAllowances = {};
  for (const plan of AI_ALLOWANCE_PLANS) {
    const value = record[plan];
    if (value !== undefined && isAllowanceValue(value)) out[plan] = value;
  }
  return out;
}

function readPromotion(values: Map<string, string>): AiPromotion | null {
  const raw = values.get(AI_PROMOTION_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { credits, startsAt, endsAt, note } = parsed as Record<string, unknown>;
  if (typeof credits !== "number" || !Number.isInteger(credits) || credits < 0) return null;
  if (typeof startsAt !== "string" || typeof endsAt !== "string") return null;
  if (Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) return null;
  return { credits, startsAt, endsAt, note: typeof note === "string" ? note : "" };
}

/** Enforcement + allowances + promotion in one query — what both the admin
 *  screen and the cap resolver read. */
export async function getAiBudgetConfig(now: Date = new Date()): Promise<AiBudgetConfig> {
  const values = await readAll();
  const promotion = readPromotion(values);
  return {
    enforcePlanCaps: readEnforcement(values),
    allowances: readAllowances(values),
    promotion,
    promotionCredits: activePromotionCredits(promotion, now),
    dollarCap: readDollarCapConfig(values),
  };
}

/** The allowance actually in force for a plan: admin-set if present, else the
 *  constant. `null` = no ceiling. */
export function resolvePlanAllowance(
  plan: AiAllowancePlan,
  allowances: AiPlanAllowances,
): number | null {
  return plan in allowances ? (allowances[plan] ?? null) : DEFAULT_AI_PLAN_ALLOWANCES[plan];
}

/** Credits of the promotion in force right now, or null. Expiry is evaluated at
 *  READ time against the stored window, so a promotion ends by itself — no admin
 *  has to remember to undo it and no cron job has to run. */
function activePromotionCredits(
  promotion: AiPromotion | null,
  now: Date = new Date(),
): number | null {
  if (!promotion) return null;
  const t = now.getTime();
  if (t < Date.parse(promotion.startsAt) || t >= Date.parse(promotion.endsAt)) return null;
  return promotion.credits;
}

export async function setPlanCapEnforcement(on: boolean): Promise<void> {
  await writeKey(AI_PLAN_CAP_ENFORCEMENT_KEY, on ? "on" : "off");
}

export async function setPlanAllowanceOverrides(allowances: AiPlanAllowances): Promise<void> {
  await writeKey(AI_PLAN_ALLOWANCES_KEY, JSON.stringify(allowances));
}

export async function setPromotion(promotion: AiPromotion | null): Promise<void> {
  await writeKey(AI_PROMOTION_KEY, promotion ? JSON.stringify(promotion) : "");
}
