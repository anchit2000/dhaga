import { and, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, eventContacts, notes } from "@/lib/db/schema";
import { lastTouchSql, recentReasonSql } from "@/lib/repo/last-touch";
import type { RecentContactListItem } from "./types";

// TODO(search-index): route through getSearchIndex() (needs paginated list support)
/**
 * People ordered by LAST TOUCH, not by capture date — someone you took a note
 * on today is more "recent" to you than a card you scanned last week and never
 * followed up. Each row carries the reason so the caller can say which it was.
 */
export async function listContacts(
  query?: string,
  tag?: string,
  limit?: number,
): Promise<RecentContactListItem[]> {
  const db = await getDb();
  const like = query?.trim() ? `%${query.trim()}%` : null;
  const conditions = [
    ne(contacts.source, "mentioned"),
    like
      ? or(
          ilike(contacts.name, like),
          ilike(contacts.title, like),
          ilike(companies.name, like),
        )
      : undefined,
    tag?.trim()
      ? sql`${contacts.tags} @> ${JSON.stringify([tag.trim()])}::jsonb`
      : undefined,
  ].filter((condition) => condition !== undefined);
  const result = db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      tags: contacts.tags,
      starred: contacts.starred,
      createdAt: contacts.createdAt,
      reason: recentReasonSql,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    // Touch sources for the ordering. Soft-deleted notes are excluded by the
    // join itself: a tombstoned note must not keep someone at the top.
    .leftJoin(notes, and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)))
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    // Both joins fan out (n notes × m events); grouping on the two primary keys
    // collapses that back to one row per contact and keeps the company name.
    .groupBy(contacts.id, companies.id)
    .orderBy(desc(lastTouchSql));
  return limit ? result.limit(limit) : result;
}
