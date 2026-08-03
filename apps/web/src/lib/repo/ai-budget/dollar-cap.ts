import {
  AI_DOLLAR_CAP_ENFORCEMENT_DEFAULT,
  AI_DOLLAR_CAP_ENFORCEMENT_KEY,
  AI_DOLLAR_CAP_FLOOR_KEY,
  AI_DOLLAR_CAP_MULTIPLIER_KEY,
  DEFAULT_AI_DOLLAR_CAP_FLOOR_USD,
  DEFAULT_AI_DOLLAR_CAP_MULTIPLIER,
} from "@/utils/constants/ai-budget";
import { writeKey } from "./store";
import type { AiDollarCapConfig } from "@/types";

/**
 * The instance-wide knobs behind the master cost gate, parsed out of the same
 * single `ai_budget_settings` read that ./config.ts already does — the dollar
 * ceiling must not cost a second query on the AI hot path.
 *
 * Stored in `ai_budget_settings` and nowhere else: this is operator config, and
 * the tenant-scoped `settings` table would make one admin's value invisible to
 * every other user's connection (see lib/db/ddl/ai-budget.ts).
 */

/** A corrupt or absent value falls back to the shipped constant rather than
 *  throwing on the AI hot path — same posture as ./config.ts's readers. */
function readNumber(raw: string | undefined, fallback: number, min: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

export function readDollarCapConfig(values: Map<string, string>): AiDollarCapConfig {
  const enforcement = values.get(AI_DOLLAR_CAP_ENFORCEMENT_KEY);
  return {
    // Once a row exists only the literal "on" reads as on — anything else is
    // corruption, and the readable-but-wrong direction to fail is the one that
    // stops enforcing, not the one that newly refuses a paying customer.
    enforced: enforcement === undefined ? AI_DOLLAR_CAP_ENFORCEMENT_DEFAULT : enforcement === "on",
    // 0 is a legal multiplier (a deliberate "paid plans get no dollar headroom
    // at all" lockdown), so the floor for validity is 0, not a positive number.
    multiplier: readNumber(
      values.get(AI_DOLLAR_CAP_MULTIPLIER_KEY),
      DEFAULT_AI_DOLLAR_CAP_MULTIPLIER,
      0,
    ),
    floorUsd: readNumber(
      values.get(AI_DOLLAR_CAP_FLOOR_KEY),
      DEFAULT_AI_DOLLAR_CAP_FLOOR_USD,
      0,
    ),
  };
}

export async function setDollarCapEnforcement(on: boolean): Promise<void> {
  await writeKey(AI_DOLLAR_CAP_ENFORCEMENT_KEY, on ? "on" : "off");
}

export async function setDollarCapMultiplier(multiplier: number): Promise<void> {
  await writeKey(AI_DOLLAR_CAP_MULTIPLIER_KEY, String(multiplier));
}

export async function setDollarCapFloorUsd(usd: number): Promise<void> {
  await writeKey(AI_DOLLAR_CAP_FLOOR_KEY, String(usd));
}
