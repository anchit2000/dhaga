import { getCurrentUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/request-scope";
import { getBillingGate } from "@/lib/hosted/gate";
import { activeGrantedCredits, getAiBudgetConfig, resolvePlanAllowance } from "@/lib/repo/ai-budget";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, getSetting } from "@/lib/repo/settings";
import { isAiAllowancePlan } from "@/utils/constants/ai-budget";
import type { AiBudgetConfig, AiPlanAllowances } from "@/types";
import { instanceDefaultCap, monthlyAiCap } from "./instance-default";

export { instanceDefaultCap, monthlyAiCap } from "./instance-default";

/**
 * THE ONE PLACE the monthly AI-credit ceiling is decided. Precedence, highest
 * first — this list is the contract, the admin screen restates it verbatim, and
 * lib/__tests__/ai-action-metering pins every rung of it:
 *
 *   1. Per-user admin override (`settings.ai_monthly_cap_override`). Wins
 *      OUTRIGHT, including over a running promotion: an admin who typed a number
 *      against one account must not have it silently replaced by a campaign.
 *      (To lift such a user during a promotion, clear the override or add a
 *      grant — grants are additive on top of it.)
 *   2. Active instance-wide promotion ("everyone gets 1000 credits this month").
 *      Applies whether or not plan-cap enforcement is on, because a generous
 *      month must not require turning caps on for everybody.
 *   3. Plan allowance — when the master switch is on (it is, by default) AND a
 *      PAID plan is in play. Admin-edited value if set, else the constant in
 *      utils/constants/plans.ts. A `null` allowance means no ceiling.
 *   4. The INSTANCE DEFAULT — `instanceDefaultCap()`, ./instance-default.ts:
 *      the admin-set FREE allowance, else `DHAGA_AI_MONTHLY_CAP`, else
 *      FREE_TIER_AI_CREDITS_PER_MONTH. This is the rung for a free user, for a
 *      user no plan governs (self-host, billing not running), and for everyone
 *      the master switch is turned off for.
 *
 * Then, on top of whichever rung won: + every active GRANT for this user. Grants
 * are additive make-goods and never touch `ai_actions`, so recorded usage is
 * unchanged and still auditable.
 *
 * THE ENV VAR IS A SEED, NOT AN OVERRIDE. `DHAGA_AI_MONTHLY_CAP` supplies the
 * starting number for an instance where nothing has been set in the database;
 * the moment an admin sets one — an override, a promotion, a plan allowance, or
 * the free allowance that doubles as the instance default — that stored number
 * wins and the env var stops mattering. Nothing is copied into the DB at boot:
 * env is simply read last, so there is one live number and the admin screen can
 * name where it came from.
 */

/**
 * A per-user monthly AI-credit allowance an admin can grant, stored on the
 * acting user's `ai_monthly_cap_override` setting. Returns a positive integer
 * or null (absent / blank / 0 / negative / non-integer → no override).
 */
async function resolveAiCapOverride(): Promise<number | null> {
  const raw = await getSetting(AI_MONTHLY_CAP_OVERRIDE_KEY);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The acting user, for callers that don't carry an id (the settings page reads
 *  its AI line with no argument). Mirrors db/request-scope.ts: outside a real
 *  request `getCurrentUser()` throws, which is just "no session". */
async function actingUserId(userId?: string): Promise<string | null> {
  if (userId) return userId;
  return (await getCurrentUser().catch(() => null))?.id ?? null;
}

/**
 * `number` = this plan's ceiling, `null` = this plan has none, `undefined` = no
 * plan is in play (billing isn't running on this instance, or there's no user),
 * in which case plan-cap enforcement simply doesn't apply and the instance
 * default governs. A self-hosted build always lands on `undefined`.
 *
 * FREE resolves through `instanceDefaultCap` rather than the plan ladder, so
 * "free" and "no plan is in play" are one number with one seed. Without that,
 * `DHAGA_AI_MONTHLY_CAP` would silently do nothing for a free user on an
 * instance that has billing — the exact confusion the seed rule exists to end.
 */
async function planAllowanceFor(
  userId: string,
  allowances: AiPlanAllowances,
): Promise<number | null | undefined> {
  const summary = await (await getBillingGate()).getPlanSummary(userId);
  if (!summary) return undefined;
  const plan = summary.status === "active" ? summary.plan : "free";
  if (!isAiAllowancePlan(plan)) return undefined;
  if (plan === "free") return instanceDefaultCap(allowances).credits;
  return resolvePlanAllowance(plan, allowances);
}

/** Rungs 1–4 without the grant layer. Returns `null` for "no ceiling". */
async function resolveCeiling(
  config: AiBudgetConfig,
  userId: string | null,
): Promise<number | null> {
  const override = await resolveAiCapOverride();
  if (override !== null) return override;

  if (config.promotionCredits !== null) return config.promotionCredits;

  if (config.enforcePlanCaps && userId) {
    const allowance = await planAllowanceFor(userId, config.allowances);
    if (allowance !== undefined) return allowance;
  }
  return instanceDefaultCap(config.allowances).credits;
}

/**
 * The cap actually enforced for the acting user, grants included. Pass `userId`
 * wherever it's known (background jobs have no session); it falls back to the
 * current session otherwise. When the winning rung says "no ceiling" this
 * returns the env/free-tier number and `hasUnlimitedAiCredits()` returns true —
 * exactly the shape callers already use (`aiUsageLabel` ignores `cap` when
 * `unlimited`), so nothing about today's display changes.
 */
export async function effectiveMonthlyAiCap(userId?: string): Promise<number> {
  const config = await getAiBudgetConfig();
  const ceiling = await resolveCeiling(config, await actingUserId(userId));
  return (ceiling ?? monthlyAiCap()) + (await activeGrantedCredits());
}

/**
 * Whether this user bypasses the monthly cap entirely.
 *
 * WITH THE MASTER SWITCH ON (the default) the credit ladder decides: a plan
 * whose allowance is `null` — Lifetime/Annual — still has no ceiling, but Free
 * (10) and Pro (300) do. A per-user override or a running promotion is an
 * explicit number, so it beats both. WITH IT OFF this falls back to
 * `hasUnlimitedAi`, i.e. the raw billing entitlement, which is the escape hatch
 * an operator reaches for during a migration or an incident.
 */
export async function hasUnlimitedAiCredits(userId: string): Promise<boolean> {
  const config = await getAiBudgetConfig();
  if (!config.enforcePlanCaps) {
    return (await getBillingGate()).hasUnlimitedAi(userId, await getDb());
  }
  return (await resolveCeiling(config, userId)) === null;
}
