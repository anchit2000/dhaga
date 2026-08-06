import { asc, inArray, sql } from "drizzle-orm";
import { recurrenceRuleFromFields } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, followUps } from "@/lib/db/schema";
import type { TaskItem } from "./types";

/** All open work, including general tasks and optionally-linked reminders. */
export async function listTasks(): Promise<TaskItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: followUps.id,
      contactId: followUps.contactId,
      contactName: contacts.name,
      companyId: followUps.companyId,
      companyName: companies.name,
      action: followUps.action,
      dueHint: followUps.dueHint,
      dueDate: followUps.dueDate,
      recurrenceFrequency: followUps.recurrenceFrequency,
      recurrenceInterval: followUps.recurrenceInterval,
      recurrenceWeekday: followUps.recurrenceWeekday,
      recurrenceMonthDay: followUps.recurrenceMonthDay,
      recurrenceMonth: followUps.recurrenceMonth,
      status: followUps.status,
      createdAt: followUps.createdAt,
    })
    .from(followUps)
    .leftJoin(contacts, sql`${contacts.id} = ${followUps.contactId}`)
    .leftJoin(companies, sql`${companies.id} = ${followUps.companyId}`)
    .where(inArray(followUps.status, ["open", "done"]))
    .orderBy(sql`${followUps.dueDate} IS NULL`, asc(followUps.dueDate), asc(followUps.createdAt));
  return rows.map((row) => ({
    id: row.id,
    contactId: row.contactId,
    contactName: row.contactName,
    companyId: row.companyId,
    companyName: row.companyName,
    action: row.action,
    dueHint: row.dueHint,
    dueDate: row.dueDate,
    recurrence: recurrenceRuleFromFields({
      frequency: row.recurrenceFrequency,
      interval: row.recurrenceInterval,
      weekday: row.recurrenceWeekday,
      monthDay: row.recurrenceMonthDay,
      month: row.recurrenceMonth,
    }),
    status: row.status as "open" | "done",
    createdAt: row.createdAt,
  }));
}
