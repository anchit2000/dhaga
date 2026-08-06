import { eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { calendarEventLinks, followUps } from "@/lib/db/schema";

/** Durable deletion receipts whose Dhaga task has already been removed. */
export async function orphanedCalendarFollowUpIds(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ id: calendarEventLinks.followUpId })
    .from(calendarEventLinks)
    .leftJoin(followUps, eq(followUps.id, calendarEventLinks.followUpId))
    .where(isNull(followUps.id));
  return rows.map((row) => row.id);
}
