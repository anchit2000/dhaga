import { PLAN_AI_CREDITS_PER_MONTH } from "../plans";

/**
 * Free-tier cloud AI credit cap per calendar month (BRD §8.3), and the
 * shipped floor of the whole cap ladder. Free gets a real, small taste of
 * cloud AI — 10 credits buys 10 card scans, or 5 scans plus 5 notes, or 5
 * Ask-Dhaga questions (per-action prices: `packages/core/src/metering/
 * credits.ts`). Deep research is 20, so it never fits in a free month, and
 * enrichment/briefs stay feature-gated to paid plans regardless (PLAN_FEATURES).
 *
 * Derived from PLAN_AI_CREDITS_PER_MONTH.free so the free tier has ONE number:
 * an admin re-sizing "Free" at /app/admin/ai-credits overrides it at runtime,
 * and `DHAGA_AI_MONTHLY_CAP` seeds it when nothing is set in the DB (see
 * lib/ai/metering/cap/index.ts).
 */
export const FREE_TIER_AI_CREDITS_PER_MONTH = PLAN_AI_CREDITS_PER_MONTH.free ?? 0;
