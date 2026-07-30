import { getDb } from "@/lib/db/request-scope";
import { getBillingGate } from "@/lib/hosted/gate";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, getSetting } from "@/lib/repo/settings";
import { FREE_TIER_AI_CREDITS_PER_MONTH } from "@/utils/constants/app";
import { currentAiActionScope } from "./action-scope";
import { aiCreditsUsedThisMonth } from "./record";

export { currentAiActionId, newAiAction, withAiAction } from "./action-scope";
export { aiCreditsUsedThisMonth, recordAiAction } from "./record";

/**
 * Self-hosters raise the cap via DHAGA_AI_MONTHLY_CAP; hosted free tier = 0
 * (cloud AI is a paid feature). A self-hoster who wants AI on the free tier
 * sets this env var to a positive number. Denominated in CREDITS — a card scan
 * costs 1, heavier actions cost more (see @dhaga/core's credit table).
 */
export function monthlyAiCap(): number {
  const fromEnv = Number(process.env.DHAGA_AI_MONTHLY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : FREE_TIER_AI_CREDITS_PER_MONTH;
}

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

/**
 * The cap actually enforced for the acting user: an admin-granted per-user
 * override if set, otherwise the instance default (`DHAGA_AI_MONTHLY_CAP` env,
 * else the free-tier constant of 0). Reads the acting user's own setting, so
 * under EE it is correctly per-user (RLS); in core it is the single global row.
 */
export async function effectiveMonthlyAiCap(): Promise<number> {
  return (await resolveAiCapOverride()) ?? monthlyAiCap();
}

/**
 * The AI-usage line shown in-app. Free tier has no cloud AI (cap 0), so a raw
 * "0 of 0 used" would read as broken — surface that AI is a paid feature
 * instead. Unlimited (paid) users see their running count; self-hosters who
 * raised the cap via DHAGA_AI_MONTHLY_CAP see "used of cap". Returns null when
 * there is nothing meaningful to show. Server-safe (no DB or client imports).
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
  if (cap <= 0) return "Cloud AI is a paid feature — upgrade to enable AI actions";
  return `${used} of ${cap} AI credits used`;
}

/**
 * Whether the acting user has any monthly AI budget left. The pre-flight check
 * for "should we even enqueue a background AI job?" — a 0-cap free-tier user (or
 * an exhausted paid month) has none, so callers can skip queuing a job that
 * would only fail. Composes the same unlimited/cap/usage accessors
 * assertAiBudget enforces with (minus the burst guard, which is about rate, not
 * budget), so there is one definition of "is there budget". Uses the
 * request-scoped getDb().
 */
export async function hasMonthlyAiBudget(userId: string): Promise<boolean> {
  if (await (await getBillingGate()).hasUnlimitedAi(userId, await getDb())) return true;
  const cap = await effectiveMonthlyAiCap();
  return (await aiCreditsUsedThisMonth()) < cap;
}

export class AiBudgetError extends Error {
  constructor(
    message: string,
    /** Which budget tripped: the monthly billing cap, or the in-memory burst
     *  guard. Lets callers branch on the two cases (same message unchanged). */
    public readonly kind: "cap" | "burst",
  ) {
    super(message);
    this.name = "AiBudgetError";
  }
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
  if (await (await getBillingGate()).hasUnlimitedAi(userId, await getDb())) return;
  const cap = await effectiveMonthlyAiCap();
  if ((await aiCreditsUsedThisMonth()) >= cap) {
    throw new AiBudgetError(`Monthly AI credit cap reached (${cap}).`, "cap");
  }
}
