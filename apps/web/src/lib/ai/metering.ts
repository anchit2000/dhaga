import { randomUUID } from "node:crypto";
import { count, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import { getBillingGate } from "@/lib/hosted/gate";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { FREE_TIER_AI_ACTIONS_PER_MONTH } from "@/utils/constants/app";
import type { LLMUsage } from "@dhaga/core";

/** Self-hosters raise the cap via DHAGA_AI_MONTHLY_CAP; hosted free tier = 25. */
export function monthlyAiCap(): number {
  const fromEnv = Number(process.env.DHAGA_AI_MONTHLY_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : FREE_TIER_AI_ACTIONS_PER_MONTH;
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
  const cap = monthlyAiCap();
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
