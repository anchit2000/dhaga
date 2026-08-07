import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  calendarDayFromUtcDate,
  calendarDayToUtcDate,
  nextRecurrenceOccurrence,
  recurrenceRuleFromFields,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import { PreconditionError } from "@/lib/repo/errors";
import { validateTaskAssociations } from "./associations";
import type { TaskCompletion, TaskInput } from "./types";

function scheduleFields(input: TaskInput): Partial<typeof followUps.$inferInsert> {
  const rule = input.recurrence;
  return {
    recurrenceFrequency: rule?.frequency ?? null,
    recurrenceInterval: rule?.interval ?? null,
    recurrenceWeekday: rule?.weekday ?? null,
    recurrenceMonthDay: rule?.monthDay ?? null,
    recurrenceMonth: rule?.month ?? null,
  };
}

export async function createTask(userId: string, input: TaskInput): Promise<string> {
  if (input.recurrence && !input.dueDate) {
    throw new PreconditionError("A repeating task needs a due date.");
  }
  await validateTaskAssociations(input.contactId, input.companyId);
  const db = await getDb();
  const id = randomUUID();
  await db.insert(followUps).values({
    id,
    userId,
    contactId: input.contactId,
    companyId: input.companyId,
    action: input.action.trim(),
    dueDate: input.dueDate,
    status: "open",
    ...scheduleFields(input),
  });
  return id;
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  if (input.recurrence && !input.dueDate) {
    throw new PreconditionError("A repeating task needs a due date.");
  }
  await validateTaskAssociations(input.contactId, input.companyId);
  const db = await getDb();
  const updated = await db
    .update(followUps)
    .set({
      contactId: input.contactId,
      companyId: input.companyId,
      action: input.action.trim(),
      dueDate: input.dueDate,
      ...scheduleFields(input),
    })
    .where(and(eq(followUps.id, id), eq(followUps.status, "open")))
    .returning({ id: followUps.id });
  if (updated.length === 0) throw new PreconditionError("Task not found.");
}

export async function completeTask(
  id: string,
  expectedOccurrence: Date | null,
): Promise<TaskCompletion> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(followUps)
      .where(and(eq(followUps.id, id), eq(followUps.status, "open")))
      .limit(1).for("update");
    if (!row) throw new PreconditionError("Task not found.");
    const rule = recurrenceRuleFromFields({
      frequency: row.recurrenceFrequency,
      interval: row.recurrenceInterval,
      weekday: row.recurrenceWeekday,
      monthDay: row.recurrenceMonthDay,
      month: row.recurrenceMonth,
    });
    if (!rule || !row.dueDate) {
      await tx.update(followUps).set({ status: "done" }).where(eq(followUps.id, id));
      return { advancedTo: null, changed: true };
    }
    if (!expectedOccurrence || expectedOccurrence.getTime() !== row.dueDate.getTime()) {
      return { advancedTo: row.dueDate, changed: false };
    }
    const nextDay = nextRecurrenceOccurrence(calendarDayFromUtcDate(row.dueDate), rule);
    if (!nextDay) throw new PreconditionError("The recurrence schedule is invalid.");
    const next = calendarDayToUtcDate(nextDay);
    await tx.update(followUps).set({ dueDate: next }).where(eq(followUps.id, id));
    return { advancedTo: next, changed: true };
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.update(followUps).set({ status: "dismissed" })
    .where(eq(followUps.id, id));
}
