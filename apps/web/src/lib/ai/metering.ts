import { randomUUID } from "node:crypto";
import { count, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { aiActions } from "@/lib/db/schema";
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
  constructor(cap: number) {
    super(`Monthly AI action cap reached (${cap}).`);
    this.name = "AiBudgetError";
  }
}

export async function assertAiBudget(): Promise<void> {
  const cap = monthlyAiCap();
  if ((await aiActionsUsedThisMonth()) >= cap) throw new AiBudgetError(cap);
}

export async function recordAiAction(
  feature: "contact_parse" | "note_extraction" | "search" | "draft" | "enrichment",
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
