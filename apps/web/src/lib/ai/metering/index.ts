import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { currentAiActionScope } from "./action-scope";
import { effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "./cap";
import { aiCreditsUsedThisMonth } from "./record";

export { currentAiActionId, newAiAction, withAiAction } from "./action-scope";
export { aiCreditsUsedThisMonth, recordAiAction } from "./record";
export { effectiveMonthlyAiCap, hasUnlimitedAiCredits, monthlyAiCap } from "./cap";

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
  if (await hasUnlimitedAiCredits(userId)) return true;
  const cap = await effectiveMonthlyAiCap(userId);
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
 *
 * "Is this user uncapped?" is `hasUnlimitedAiCredits`, not the billing gate
 * directly: with the plan-cap master switch off it IS the billing gate (today's
 * behaviour, unchanged), and with it on the credit ladder decides. See ./cap.ts
 * for the full precedence.
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
  if (await hasUnlimitedAiCredits(userId)) return;
  const cap = await effectiveMonthlyAiCap(userId);
  if ((await aiCreditsUsedThisMonth()) >= cap) {
    throw new AiBudgetError(`Monthly AI credit cap reached (${cap}).`, "cap");
  }
}
