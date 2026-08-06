import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import { listTasks } from "@/lib/repo/tasks";
import { listDueReachOuts } from "./reach-outs";
import type { TaskItem } from "@/lib/repo/tasks";

export type OpenFollowUpItem = TaskItem;

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
  return (await listTasks()).filter((task) => task.status === "open");
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
