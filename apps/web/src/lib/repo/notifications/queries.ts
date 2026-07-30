import { desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, notifications } from "@/lib/db/schema";
import {
  NOTIFICATION_FEED_LIMIT,
  type NotificationStatus,
  type NotificationType,
} from "@/utils/constants/notifications";

/**
 * One row of the notification feed, shaped so it can sit in ONE list alongside
 * the derived follow-up / important-date reminders the nav bell already renders
 * (which are computed, not stored). `kind` is the discriminant that tells those
 * apart — a persisted notification is the only member that can be marked read
 * or dismissed.
 *
 * `createdAt` is an ISO string, not a Date: the bell is a client component, so
 * the value crosses the server/client boundary (same call as
 * reminders/calendar.ts CalendarFollowUp.dueDate).
 */
export interface NotificationItem {
  kind: "notification";
  id: string;
  type: NotificationType;
  /** The line the user reads — already human and specific. */
  title: string;
  /** Optional second line (error message / paid-feature notice). */
  body: string | null;
  /** Never "dismissed" from these reads — dismissed rows are excluded. */
  status: NotificationStatus;
  contactId: string | null;
  contactName: string | null;
  /** Where the row navigates: the subject's page, or null when there is none. */
  href: string | null;
  createdAt: string;
}

function toItem(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  status: NotificationStatus;
  contactId: string | null;
  contactName: string | null;
  createdAt: Date;
}): NotificationItem {
  return {
    kind: "notification",
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    contactId: row.contactId,
    contactName: row.contactName,
    // The person page is also where the Retry affordance for a failed job
    // lives, so a job_failed row's link IS its retry path.
    href: row.contactId ? `/app/people/${row.contactId}` : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Unread + read notifications, newest first, dismissed excluded. ONE query
 * (contact name joined, not fetched per row — an N+1 here would fan getDb()
 * across the small tenant pool).
 */
export async function listRecentNotifications(
  limit: number = NOTIFICATION_FEED_LIMIT,
): Promise<NotificationItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      status: notifications.status,
      contactId: notifications.contactId,
      contactName: contacts.name,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .leftJoin(contacts, eq(contacts.id, notifications.contactId))
    .where(ne(notifications.status, "dismissed"))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map(toItem);
}

/** Cheap COUNT for the bell badge — no join, no hydration. */
export async function countUnreadNotifications(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(eq(notifications.status, "unread"));
  return row?.count ?? 0;
}
