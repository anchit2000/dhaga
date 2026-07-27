import { desc, eq, sql } from "drizzle-orm";
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

/** All open follow-ups across the graph, for the Home feed. */
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
    .orderBy(desc(followUps.createdAt));
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
