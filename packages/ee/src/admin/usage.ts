import { and, count, eq, gte } from "drizzle-orm";
import { creditsForAiAction } from "@dhaga/core";
import { openAdminConnection } from "../db/admin-db";
import { eeAiActions } from "../db/schema";

/**
 * Credits a user has spent this calendar month — the same unit the cap is
 * denominated in, so the admin panel's "used / allowance" line compares like
 * with like. One `ai_actions` row is one user-visible action (however many
 * model calls it took); what it costs in credits depends on which action it
 * was, per core's credit table.
 *
 * ai_actions carries RLS — this must go through the bypass connection to see a
 * specific user's rows from an admin context (no session for them).
 */
export async function aiCreditsThisMonthFor(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { db, release } = await openAdminConnection();
  try {
    const rows = await db
      .select({ feature: eeAiActions.feature, n: count() })
      .from(eeAiActions)
      .where(and(eq(eeAiActions.userId, userId), gte(eeAiActions.createdAt, monthStart)))
      .groupBy(eeAiActions.feature);
    return rows.reduce((total, row) => total + row.n * creditsForAiAction(row.feature), 0);
  } finally {
    await release();
  }
}
