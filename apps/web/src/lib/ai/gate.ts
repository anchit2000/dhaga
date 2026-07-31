import { cache } from "react";
import { hasLLM } from "@dhaga/core";
import { aiCreditsUsedThisMonth, effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "@/lib/ai/metering";
import {
  AI_GATE_PAID_FEATURE_REASON,
  aiGateExhaustedReason,
} from "@/utils/constants/ai-gate";

/**
 * Why every AI control should be greyed out for this user right now, or `null`
 * when they are all usable.
 *
 * THE GATE IS "ZERO LEFT", NOT "CAN I AFFORD THIS ONE". `assertAiBudget` refuses
 * on `used >= cap` and never looks at what the action costs, so a user with 2
 * credits left is genuinely allowed to run deep research at 20 and go over. A
 * per-action-price gate would therefore disable buttons the server would happily
 * run — a different lie, and one that needs the credit table in the client. This
 * predicate is the same three accessors `assertAiBudget` composes, in the same
 * order, so the UI can never disagree with the server about who is refused.
 *
 * `!hasLLM()` deliberately returns null: with no API key the existing degraded
 * path owns the message ("Configure an LLM provider to …"), and greying the same
 * buttons for a second reason would only make a self-hosted instance look
 * broken. This is about credits.
 *
 * Memoized with React `cache()` so several server components on one page resolve
 * it ONCE — the metering reads go through the request-scoped `getDb()` and a
 * per-component fan-out is how the tenant pool gets exhausted (docs/FOLLOW_UPS.md).
 */
export const aiGateReason = cache(async (userId: string): Promise<string | null> => {
  if (!hasLLM()) return null;
  if (await hasUnlimitedAiCredits(userId)) return null;
  const cap = await effectiveMonthlyAiCap(userId);
  if ((await aiCreditsUsedThisMonth()) < cap) return null;
  return cap <= 0 ? AI_GATE_PAID_FEATURE_REASON : aiGateExhaustedReason(cap);
});
