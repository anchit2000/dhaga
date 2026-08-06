import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, eventContacts, notes } from "@/lib/db/schema";
import { surfaceableContact } from "@/lib/repo/contacts/surfaceable";
import { lastTouchSql } from "@/lib/repo/last-touch";
import { userTimeZone } from "../local-today";
import { isReachOutDue } from "./schedule";

export interface DueReachOut {
  id: string;
  name: string;
  title: string | null;
  companyName: string | null;
  lastTouch: Date;
  everyDays: number;
}

/**
 * Cadence feed. Valid calendar selectors decide due-ness in the user's IANA
 * zone; day-count-only rows retain the old elapsed-time comparison.
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
      reachOutRecurrenceFrequency: contacts.reachOutRecurrenceFrequency,
      reachOutRecurrenceInterval: contacts.reachOutRecurrenceInterval,
      reachOutRecurrenceWeekday: contacts.reachOutRecurrenceWeekday,
      reachOutRecurrenceMonthDay: contacts.reachOutRecurrenceMonthDay,
      reachOutRecurrenceMonth: contacts.reachOutRecurrenceMonth,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .leftJoin(notes, and(eq(notes.contactId, contacts.id), isNull(notes.deletedAt)))
    .leftJoin(eventContacts, eq(eventContacts.contactId, contacts.id))
    .where(and(isNotNull(contacts.reachOutEveryDays), surfaceableContact))
    .groupBy(contacts.id, companies.id)
    .orderBy(lastTouchSql);
  const hasCalendarSchedule = rows.some((row) => row.reachOutRecurrenceFrequency !== null);
  const timeZone = hasCalendarSchedule ? await userTimeZone() : "UTC";
  const now = new Date();
  return rows.flatMap((row) => {
    const lastTouch = new Date(row.lastTouch);
    if (!isReachOutDue(row.everyDays, lastTouch, row, timeZone, now)) return [];
    return [{
      id: row.id,
      name: row.name,
      title: row.title,
      companyName: row.companyName,
      lastTouch,
      everyDays: row.everyDays ?? 0,
    }];
  });
}

export async function markReachedOut(contactId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(contacts)
    .set({ lastReachedOutAt: new Date() })
    .where(eq(contacts.id, contactId));
}
