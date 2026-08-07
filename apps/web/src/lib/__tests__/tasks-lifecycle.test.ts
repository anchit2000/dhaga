import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import { completeTask, createTask, deleteTask, listTasks } from "@/lib/repo/tasks";

const MONTHLY = {
  frequency: "monthly" as const,
  interval: 1,
  weekday: null,
  monthDay: 31,
  month: null,
};

describe("task lifecycle", () => {
  it("advances a recurring occurrence exactly once when the same completion is retried", async () => {
    const due = new Date("2026-08-31T00:00:00.000Z");
    const id = await createTask(`owner-${randomUUID()}`, {
      action: "Close the books",
      dueDate: due,
      contactId: null,
      companyId: null,
      recurrence: MONTHLY,
    });

    const [first, retry] = await Promise.all([
      completeTask(id, due),
      completeTask(id, due),
    ]);
    const [row] = await (await getDb()).select().from(followUps).where(eq(followUps.id, id));

    // WHY: a queued double click names one occurrence; it must not skip the
    // September occurrence by applying the same intent twice.
    expect([first.changed, retry.changed].sort()).toEqual([false, true]);
    expect(row.status).toBe("open");
    expect(row.dueDate?.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });

  it("keeps dismissed rows out of both active and completed task views", async () => {
    const id = await createTask(`owner-${randomUUID()}`, {
      action: "Temporary task",
      dueDate: null,
      contactId: null,
      companyId: null,
      recurrence: null,
    });
    await deleteTask(id);

    // WHY: Delete is a recoverable soft-dismiss internally, but the completed
    // tab is work history, not a trash can.
    expect((await listTasks()).some((task) => task.id === id)).toBe(false);
    const [row] = await (await getDb()).select().from(followUps).where(eq(followUps.id, id));
    expect(row.status).toBe("dismissed");
  });

  it("rejects recurrence without a concrete first occurrence", async () => {
    await expect(createTask(`owner-${randomUUID()}`, {
      action: "Missing first date",
      dueDate: null,
      contactId: null,
      companyId: null,
      recurrence: MONTHLY,
    })).rejects.toThrow("needs a due date");
  });
});
