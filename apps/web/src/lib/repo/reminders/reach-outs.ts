import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, eventContacts, notes } from "@/lib/db/schema";
import { lastTouchSql } from "@/lib/repo/last-touch";

/** Idea #2: "when should I remind you to reach out" — cadence per contact. */

export interface DueReachOut {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  lastTouch: Date;
  everyDays: number;
}

/**
 * Cadence feed: contacts whose keep-in-touch interval has elapsed since their
 * last touch. "Last touch" is `lastTouchSql` — writing a note or scanning
 * someone at an event resets the clock exactly as an explicit "I reached out"
 * does, so Home stops nagging about people you just spoke to.
 *
 * Unbounded on purpose: `getPendingReminderSummary` and Home's "+N more due"
 * counter both need the full set. A naive LIMIT under this ORDER BY would be
 * WRONG — oldest-touch-first is not most-overdue-first: it keeps a yearly
 * contact 400 days late (overdue ratio 0.09) and drops a weekly contact 8 days
 * late (ratio 1.14). If this ever needs bounding, change the ORDER BY to
 * overdue ratio desc first.
 */
export async function listDueReachOuts(): Promise<DueReachOut[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
      lastTouch: lastTouchSql,
      everyDays: contacts.reachOutEveryDays,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    // lastTouchSql is an aggregate: it needs both touch tables joined in, with
    // soft-deleted notes excluded (a tombstoned note is not a touch).
    .leftJoin(
      notes,
      and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)),
    )
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(
      and(
        // Stays in WHERE, never HAVING: it filters BEFORE the notes/event
        // fan-out, so only the small minority of contacts that actually carry a
        // cadence get expanded. In HAVING it would fan out the whole table.
        isNotNull(contacts.reachOutEveryDays),
        // Note-mention stubs ("Prashant's son") are not people you can message.
        ne(contacts.source, "mentioned"),
      ),
    )
    .groupBy(contacts.id, companies.id)
    .having(
      sql`${lastTouchSql} + make_interval(days => ${contacts.reachOutEveryDays}) < now()`,
    )
    .orderBy(sql`${lastTouchSql} asc`);
  return rows.map((row) => ({
    ...row,
    lastTouch: new Date(row.lastTouch),
    everyDays: row.everyDays ?? 0,
  }));
}

export function isReachOutDue(
  everyDays: number | null,
  lastTouch: Date,
): boolean {
  if (everyDays == null) return false;
  return Date.now() - lastTouch.getTime() > everyDays * 86_400_000;
}

export async function setCadence(
  contactId: string,
  days: number | null,
): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ reachOutEveryDays: days })
    .where(eq(contacts.id, contactId));
}

export async function markReachedOut(contactId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ lastReachedOutAt: new Date() })
    .where(eq(contacts.id, contactId));
}
