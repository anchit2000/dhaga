import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { notifications } from "@/lib/db/schema";
import type { NotificationType } from "@/utils/constants/notifications";

export interface CreateNotificationInput {
  type: NotificationType;
  /** Already-composed, human copy — see ./job-copy.ts for the job builders. */
  title: string;
  body?: string | null;
  contactId?: string | null;
  jobId?: string | null;
}

/**
 * Insert one notification. Uses the ambient scoped connection (getDb), so it is
 * callable from inside an existing `withUserDb(...)` block — which is how the
 * extraction worker writes it, sharing the same connection as the job status
 * update rather than opening a second one.
 */
export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(notifications).values({
    id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    contactId: input.contactId ?? null,
    jobId: input.jobId ?? null,
  });
  return id;
}

export async function markNotificationRead(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(notifications.id, id));
}

/** Removes the row from every feed read. The row is KEPT (not deleted) so a
 *  re-run of the same job can't resurrect a notification the user dismissed. */
export async function dismissNotification(id: string): Promise<void> {
  const db = await getDb();
  await db.update(notifications).set({ status: "dismissed" }).where(eq(notifications.id, id));
}

/** "Mark all read" — one statement, only the unread rows. */
export async function markAllNotificationsRead(): Promise<void> {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ status: "read", readAt: new Date() })
    .where(eq(notifications.status, "unread"));
}
