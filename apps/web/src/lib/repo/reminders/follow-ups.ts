import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, followUps } from "@/lib/db/schema";
import { listDueReachOuts } from "./reach-outs";

export interface OpenFollowUpItem {
  id: string;
  contactId: string;
  contactName: string;
  action: string;
  dueHint: string | null;
  dueDate: Date | null;
  createdAt: Date;
}

/**
 * All open follow-ups across the graph, for the Home feed and /app/follow-ups.
 *
 * Ordered the way you actually work the list: everything with a due date first,
 * soonest (and most overdue) at the top, then the undated ones oldest-first so
 * the thing that has been waiting longest surfaces instead of sinking. Newest-
 * first buried both — an item due tomorrow sat below one captured an hour ago.
 * `due_date IS NULL` sorts false(0) before true(1) in Postgres, which is the
 * dated-before-undated split; the two keys after it apply to one group each.
 */
export async function listAllOpenFollowUps(): Promise<OpenFollowUpItem[]> {
  const db = await getDb();
  return db
    .select({
      id: followUps.id,
      contactId: followUps.contactId,
      contactName: contacts.name,
      action: followUps.action,
      dueHint: followUps.dueHint,
      dueDate: followUps.dueDate,
      createdAt: followUps.createdAt,
    })
    .from(followUps)
    .innerJoin(contacts, eq(contacts.id, followUps.contactId))
    .where(eq(followUps.status, "open"))
    .orderBy(sql`${followUps.dueDate} IS NULL`, asc(followUps.dueDate), asc(followUps.createdAt));
}

export interface PendingReminderSummary {
  /** Open follow-ups (actions still to do). */
  openFollowUps: number;
  /** Contacts overdue for a keep-in-touch check-in. */
  dueReachOuts: number;
}

/**
 * Counts the pending items the morning reminder nudges about — a cheap COUNT
 * for open follow-ups plus the already-computed due reach-outs. Sequential (not
 * Promise.all) so it never fans getDb() out into two connections at once.
 */
export async function getPendingReminderSummary(): Promise<PendingReminderSummary> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followUps)
    .where(eq(followUps.status, "open"));
  const dueReachOuts = (await listDueReachOuts()).length;
  return { openFollowUps: row?.count ?? 0, dueReachOuts };
}
