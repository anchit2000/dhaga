import { randomUUID } from "node:crypto";
import { count, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import { getBillingGate } from "@/lib/hosted/gate";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { AI_MONTHLY_CAP_OVERRIDE_KEY, getSetting } from "@/lib/repo/settings";
import { FREE_TIER_AI_ACTIONS_PER_MONTH } from "@/utils/constants/app";
import type { LLMUsage } from "@dhaga/core";

/**
 * Self-hosters raise the cap via DHAGA_AI_MONTHLY_CAP; hosted free tier = 0
 * (cloud AI is a paid feature). A self-hoster who wants AI on the free tier
 * sets this env var to a positive number.
 */
export function monthlyAiCap(): number {
  const fromEnv = Number(process.env.DHAGA_AI_MONTHLY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : FREE_TIER_AI_ACTIONS_PER_MONTH;
}

/**
 * A per-user monthly AI-action allowance ("credits") an admin can grant, stored
 * on the acting user's `ai_monthly_cap_override` setting. Returns a positive
 * integer or null (absent / blank / 0 / negative / non-integer → no override).
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
  if (unlimited) return `${used} AI actions used`;
  if (cap <= 0) return "Cloud AI is a paid feature — upgrade to enable AI actions";
  return `${used} of ${cap} AI actions used`;
}

export async function aiActionsUsedThisMonth(): Promise<number> {
  const db = await getDb();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [row] = await db
    .select({ n: count() })
    .from(aiActions)
    .where(gte(aiActions.createdAt, monthStart));
  return row?.n ?? 0;
}

export class AiBudgetError extends Error {
  constructor(message: string) {
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
 */
export async function assertAiBudget(userId: string): Promise<void> {
  try {
    await enforceRateLimit(userId, "ai");
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new AiBudgetError("You're doing that a lot — wait a few seconds and try again.");
    }
    throw error;
  }
  if (await (await getBillingGate()).hasUnlimitedAi(userId)) return;
  const cap = await effectiveMonthlyAiCap();
  if ((await aiActionsUsedThisMonth()) >= cap) {
    throw new AiBudgetError(`Monthly AI action cap reached (${cap}).`);
  }
}

export async function recordAiAction(
  feature:
    | "contact_parse"
    | "note_extraction"
    | "search"
    | "draft"
    | "enrichment"
    | "brief"
    | "signal_detection",
  model: string,
  usage: LLMUsage,
): Promise<void> {
  const db = await getDb();
  await db.insert(aiActions).values({
    id: randomUUID(),
    feature,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
}
