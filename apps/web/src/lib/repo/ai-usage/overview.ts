import { count, desc, gte } from "drizzle-orm";
import { creditsForAiAction } from "@dhaga/core";
import { effectiveMonthlyAiCap, hasUnlimitedAiCredits } from "@/lib/ai/metering";
import { getDb } from "@/lib/db/request-scope";
import { aiActions } from "@/lib/db/schema";
import { activeGrantedCredits, getAiBudgetConfig } from "@/lib/repo/ai-budget";
import { AI_ACTIVITY_LIMIT } from "@/utils/constants/ai-credits";
import { labelFor, toActivityRow } from "./shared";
import type { AiCreditActivityRow, AiCreditBreakdownRow, AiCreditsOverview } from "@/types";

/**
 * The acting user's own AI-credit ledger — what /app/settings#credits renders.
 *
 * The month total is derived FROM the breakdown rather than read separately, so
 * the rows on the page can never fail to add up to the headline number. A test
 * pins that total against `aiCreditsUsedThisMonth()` (the figure the cap is
 * actually enforced against), because "the page agrees with the enforcement" is
 * the property that matters, not the arithmetic.
 *
 * Everything here runs on ONE request-scoped connection: `getDb()` is memoized
 * per request, so the two statements below and the metering reads that follow
 * share it. That is deliberately not a `getDb()` fan-out — see the
 * pool-exhaustion history in docs/FOLLOW_UPS.md.
 */

/** The metering layer counts a month from the first instant of the UTC month;
 *  this page must draw its line in exactly the same place or the breakdown and
 *  the cap would disagree at a month boundary. */
function monthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function nextMonthStartUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Costliest first, then busiest — free actions naturally sink to the bottom
 *  without being singled out or dropped. */
function byCostThenVolume(a: AiCreditBreakdownRow, b: AiCreditBreakdownRow): number {
  return b.credits - a.credits || b.count - a.count || a.label.localeCompare(b.label);
}

export async function getAiCreditsOverview(
  userId: string,
  now: Date = new Date(),
): Promise<AiCreditsOverview> {
  const db = await getDb();

  const grouped = await db
    .select({ feature: aiActions.feature, n: count() })
    .from(aiActions)
    .where(gte(aiActions.createdAt, monthStartUtc(now)))
    .groupBy(aiActions.feature);

  const breakdown: AiCreditBreakdownRow[] = grouped
    .map((row) => {
      const price = creditsForAiAction(row.feature);
      return {
        feature: row.feature,
        label: labelFor(row.feature).many,
        count: row.n,
        credits: row.n * price,
        free: price === 0,
      };
    })
    .sort(byCostThenVolume);

  const totalCredits = breakdown.reduce((sum, row) => sum + row.credits, 0);
  const totalActions = breakdown.reduce((sum, row) => sum + row.count, 0);

  // Bounded, and deliberately NOT filtered to this month: a user opening the
  // page on the 1st should still see what they last spent, and the month's
  // accounting is the breakdown above, not this list.
  const recentRows = await db
    .select({ id: aiActions.id, feature: aiActions.feature, createdAt: aiActions.createdAt })
    .from(aiActions)
    .orderBy(desc(aiActions.createdAt))
    .limit(AI_ACTIVITY_LIMIT);

  const recent: AiCreditActivityRow[] = recentRows.map(toActivityRow);

  const [unlimited, cap, granted, config] = await Promise.all([
    hasUnlimitedAiCredits(userId),
    effectiveMonthlyAiCap(userId),
    activeGrantedCredits(),
    getAiBudgetConfig(now),
  ]);

  // `effectiveMonthlyAiCap` is "whichever ceiling won, plus grants", so the base
  // is what's left when the grants come back off. A promotion is only claimed as
  // the explanation when it IS the winning rung — an admin override outranks it,
  // and blaming the promotion for someone else's number would be a lie.
  const base = cap - granted;
  const promotionCredits =
    config.promotionCredits !== null && config.promotionCredits === base
      ? config.promotionCredits
      : null;

  return {
    allowance: {
      used: totalCredits,
      cap,
      remaining: Math.max(0, cap - totalCredits),
      unlimited,
      base,
      granted,
      promotionCredits,
      resetsAt: nextMonthStartUtc(now),
    },
    breakdown,
    totalCredits,
    totalActions,
    recent,
  };
}
