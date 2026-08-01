import { creditsForAiAction } from "@dhaga/core";
import { AI_ACTION_LABELS, UNKNOWN_AI_ACTION_LABEL } from "@/utils/constants/ai-credits";
import type { AiCreditActivityRow } from "@/types";

/**
 * Naming/pricing shared by the bounded `recent` list (overview.ts) and the
 * paginated history (activity.ts) — both read raw `ai_actions` rows and both
 * have to turn a feature id into what the user actually spent it on.
 */
export function labelFor(feature: string): { one: string; many: string } {
  return AI_ACTION_LABELS[feature as keyof typeof AI_ACTION_LABELS] ?? UNKNOWN_AI_ACTION_LABEL;
}

/** One raw `ai_actions` row, priced and named the way a user would recognize it. */
export function toActivityRow(row: {
  id: string;
  feature: string;
  createdAt: Date;
}): AiCreditActivityRow {
  const price = creditsForAiAction(row.feature);
  return {
    id: row.id,
    label: labelFor(row.feature).one,
    credits: price,
    free: price === 0,
    at: row.createdAt,
  };
}
