import { FREE_TIER_AI_CREDITS_PER_MONTH } from "@/utils/constants/app";
import type { AiCapDefault, AiPlanAllowances } from "@/types";

/**
 * The bottom rung of the cap ladder, kept apart from the resolver in ./index.ts
 * because it answers a different question: not "which rung wins for this user"
 * but "what is this instance's default number, and who set it".
 *
 * The admin-set FREE allowance IS the instance default, on purpose: "free" and
 * "nobody is paying on this instance" are the same rung, so an operator has one
 * control instead of two that can disagree. `DHAGA_AI_MONTHLY_CAP` only SEEDS
 * it — it supplies the starting number until that control is used, and stops
 * mattering the moment it is. Nothing is written to the database at boot; env is
 * simply read last, which is what lets the admin screen name the live source.
 *
 * Denominated in CREDITS — a card scan costs 1, heavier actions cost more (see
 * @dhaga/core's credit table).
 */
export function instanceDefaultCap(allowances: AiPlanAllowances): AiCapDefault {
  if ("free" in allowances) return { credits: allowances.free ?? null, source: "admin" };
  const fromEnv = Number(process.env.DHAGA_AI_MONTHLY_CAP);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return { credits: fromEnv, source: "env" };
  return { credits: FREE_TIER_AI_CREDITS_PER_MONTH, source: "shipped" };
}

/** The env/shipped half of the above as a plain number, for display fallbacks
 *  with no config in hand. Reads no database, so it cannot see an admin-set free
 *  allowance — use `effectiveMonthlyAiCap()` for anything that gates a call. */
export function monthlyAiCap(): number {
  return instanceDefaultCap({}).credits ?? FREE_TIER_AI_CREDITS_PER_MONTH;
}
