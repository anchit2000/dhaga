import { and, count, eq, gte } from "drizzle-orm";
import { openAdminConnection } from "../db/admin-db";
import { eeAiActions } from "../db/schema";

/** ai_actions carries RLS — this must go through the bypass connection to
 *  see a specific user's rows from an admin context (no session for them). */
export async function aiActionsThisMonthFor(userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { db, release } = await openAdminConnection();
  try {
    const [row] = await db
      .select({ n: count() })
      .from(eeAiActions)
      .where(and(eq(eeAiActions.userId, userId), gte(eeAiActions.createdAt, monthStart)));
    return row?.n ?? 0;
  } finally {
    await release();
  }
}
