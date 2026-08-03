import { getAiBudgetConfig } from "@/lib/repo/ai-budget";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { currentAiActionScope } from "./action-scope";
import { effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "./cap";
import { effectiveMonthlyDollarCap } from "./dollar-cap";
import { aiCreditsUsedThisMonth } from "./record";
import { aiDollarsUsedThisMonth } from "./spend";

export { currentAiActionId, newAiAction, withAiAction } from "./action-scope";
export { aiCreditsUsedThisMonth, recordAiAction } from "./record";
export { aiDollarsUsedThisMonth, aiSpendGroupsThisMonth } from "./spend";
export { ceilingForPlanRevenue, effectiveMonthlyDollarCap } from "./dollar-cap";
export {
  effectiveMonthlyAiCap,
  hasUnlimitedAiCredits,
  instanceDefaultCap,
  monthlyAiCap,
} from "./cap";

/**
 * The AI-usage line shown in-app. Everyone with a ceiling — free tier included,
 * at 10 credits a month — sees "used of cap". A cap of 0 is still reachable (an
 * admin can set a plan's allowance to 0, or an operator can pin
 * DHAGA_AI_MONTHLY_CAP=0 on a self-host with no LLM budget), and "0 of 0 used"
 * would read as broken, so that case says AI is off instead. Unlimited plans see
 * their running count. Returns null when there is nothing meaningful to show.
 * Server-safe (no DB or client imports).
 */
export function aiUsageLabel({
  used,
  cap,
  unlimited,
}: {
  used: number;
  cap: number;
  unlimited: boolean;
}): string | null {
  if (unlimited) return `${used} AI credits used`;
  if (cap <= 0) return "No monthly AI credits on this plan — upgrade to enable AI actions";
  return `${used} of ${cap} AI credits used`;
}

/**
 * Whether the acting user has any monthly AI budget left. The pre-flight check
 * for "should we even enqueue a background AI job?" — a user who has spent the
 * month's credits (10 on free, their plan's allowance otherwise) has none, so
 * callers can skip queuing a job that would only fail. Composes the same
 * unlimited/cap/usage accessors
 * assertAiBudget enforces with (minus the burst guard, which is about rate, not
 * budget), so there is one definition of "is there budget". Uses the
 * request-scoped getDb().
 */
export async function hasMonthlyAiBudget(userId: string): Promise<boolean> {
  if (!(await withinDollarCeiling(userId))) return false;
  if (await hasUnlimitedAiCredits(userId)) return true;
  const cap = await effectiveMonthlyAiCap(userId);
  return (await aiCreditsUsedThisMonth()) < cap;
}

export class AiBudgetError extends Error {
  constructor(
    message: string,
    /** Which budget tripped: the monthly CREDIT cap, the monthly DOLLAR ceiling
     *  (the operator's master cost gate), or the in-memory burst guard. Lets
     *  callers branch on the cases (same message unchanged). `cap` and
     *  `dollar_cap` are both "no more AI this month" and should be handled
     *  alike; only `burst` is worth retrying in seconds. */
    public readonly kind: "cap" | "dollar_cap" | "burst",
  ) {
    super(message);
    this.name = "AiBudgetError";
  }
}

/**
 * The master cost gate: is this user still under their monthly inference-DOLLAR
 * ceiling? `true` when no ceiling applies (self-host, enforcement off) — see
 * ./dollar-cap.ts for the full ladder.
 *
 * Costs one config read plus one aggregate over `ai_actions`, both sequential
 * on the request-scoped connection. `hasUnlimitedAiCredits` is NOT consulted:
 * an unlimited-CREDIT plan (Lifetime) is exactly the account this gate has to
 * bound, since nothing else does.
 */
async function withinDollarCeiling(userId?: string): Promise<boolean> {
  const config = await getAiBudgetConfig();
  const ceiling = await effectiveMonthlyDollarCap(config, userId);
  if (ceiling.usd === null) return true;
  return (await aiDollarsUsedThisMonth()) < ceiling.usd;
}

/**
 * Gate every AI call: a per-user burst limit (cheap, in-memory) first, then the
 * monthly cap. The burst guard is surfaced as `AiBudgetError` so every existing
 * call site's `instanceof AiBudgetError` catch shows its message unchanged —
 * it blocks rapid-fire abuse (SCALING.md lever 5) before we touch the DB, and
 * is distinct from the monthly billing cap below.
 *
 * The cap is charged per ACTION, not per call: once the action in flight has
 * metered a call it is already counted against the month, so a second call
 * inside it skips the cap check. Without that, a user one credit below the cap
 * would pass the check on a card scan's first call and then be refused
 * mid-action on its second — billed for a scan they never got.
 *
 * "Is this user uncapped?" is `hasUnlimitedAiCredits`, not the billing gate
 * directly: with the plan-cap master switch off it IS the billing gate (today's
 * behaviour, unchanged), and with it on the credit ladder decides. See ./cap.ts
 * for the full precedence.
 *
 * TWO INDEPENDENT CEILINGS, AND WHY CREDITS SPEAK FIRST. Credits and dollars
 * bound different things and a user can hit either first: credits bound what a
 * user may DO (and three metered features cost 0 credits on purpose, so credits
 * alone no longer bound spend), while the dollar ceiling bounds what their month
 * may COST us. Neither subsumes the other — a Lifetime account has no credit
 * ceiling at all but still has a dollar one, and a free account can exhaust ten
 * credits while costing six cents.
 *
 * Credits are therefore checked first, dollars second, because the credit
 * message is the one a user can act on ("you've used your 300 credits" →
 * upgrade); the dollar gate is the operator's backstop and should only be the
 * voice in the room when the credit ladder did not already stop it. Crucially
 * the dollar check sits OUTSIDE the `hasUnlimitedAiCredits` early return — if it
 * were nested inside, unlimited-credit plans would bypass the master gate
 * entirely, which is precisely the account it exists to bound.
 */
export async function assertAiBudget(userId: string): Promise<void> {
  try {
    await enforceRateLimit(userId, "ai");
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new AiBudgetError("You're doing that a lot — wait a few seconds and try again.", "burst");
    }
    throw error;
  }
  if (currentAiActionScope()?.recorded) return;

  if (!(await hasUnlimitedAiCredits(userId))) {
    const cap = await effectiveMonthlyAiCap(userId);
    if ((await aiCreditsUsedThisMonth()) >= cap) {
      throw new AiBudgetError(`Monthly AI credit cap reached (${cap}).`, "cap");
    }
  }

  if (!(await withinDollarCeiling(userId))) {
    throw new AiBudgetError(
      "This account has reached its monthly AI spending limit. It resets at the start of next month.",
      "dollar_cap",
    );
  }
}
