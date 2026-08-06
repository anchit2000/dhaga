import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { followUps, type FollowUpRow } from "@/lib/db/schema";
import { completeTask } from "@/lib/repo/tasks";
import type { TaskCompletion } from "@/lib/repo/tasks";

export async function listOpenFollowUps(contactId: string): Promise<FollowUpRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(followUps)
    .where(and(eq(followUps.contactId, contactId), eq(followUps.status, "open")))
    .orderBy(desc(followUps.createdAt));
}

export async function setFollowUpStatus(
  followUpId: string,
  status: "done" | "dismissed",
  expectedOccurrence: Date | null = null,
): Promise<TaskCompletion> {
  if (status === "done") return completeTask(followUpId, expectedOccurrence);
  const db = await getDb();
  await db.update(followUps).set({ status }).where(eq(followUps.id, followUpId));
  return { advancedTo: null, changed: true };
}

/**
 * Edit an open follow-up's action text and/or due date. Manual, no LLM —
 * the user-facing counterpart to createFollowUpAction. A `null` dueDate
 * clears the date; an omitted key leaves that column untouched.
 */
export async function updateFollowUp(
  id: string,
  patch: { action?: string; dueDate?: Date | null },
): Promise<void> {
  const db = await getDb();
  await db.update(followUps).set(patch).where(eq(followUps.id, id));
}
