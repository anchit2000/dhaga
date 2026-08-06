import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { completeCalendarFollowUpAction } from "@/lib/actions/follow-ups";
import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import { createTask } from "@/lib/repo/tasks";

vi.mock("@/lib/auth/guard", () => ({
  getCurrentUser: async () => null,
  requireUserId: async () => "calendar-test-user",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/calendar/write-out", () => ({ scheduleCalendarWriteOut: vi.fn() }));

function completionForm(id: string, due: Date): FormData {
  const data = new FormData();
  data.set("followUpId", id);
  data.set("expectedDueDate", due.toISOString());
  return data;
}

async function task(recurring: boolean): Promise<{ due: Date; id: string }> {
  const due = new Date("2026-08-31T00:00:00.000Z");
  const id = await createTask("calendar-test-user", {
    action: recurring ? "Close the books monthly" : "Close the books once",
    contactId: null,
    companyId: null,
    dueDate: due,
    recurrence: recurring
      ? { frequency: "monthly", interval: 1, weekday: null, monthDay: 31, month: null }
      : null,
  });
  return { due, id };
}

describe("completeCalendarFollowUpAction", () => {
  it("returns the advanced occurrence while leaving a recurring row open", async () => {
    const { due, id } = await task(true);
    const result = await completeCalendarFollowUpAction(completionForm(id, due));
    const [row] = await (await getDb()).select().from(followUps).where(eq(followUps.id, id));
    expect(result.advancedTo).toBe("2026-09-30T00:00:00.000Z");
    expect(row).toMatchObject({ status: "open", dueDate: new Date(result.advancedTo!) });
  });

  it("returns no next occurrence after completing a one-off row", async () => {
    const { due, id } = await task(false);
    const result = await completeCalendarFollowUpAction(completionForm(id, due));
    const [row] = await (await getDb()).select().from(followUps).where(eq(followUps.id, id));
    expect(result.advancedTo).toBeNull();
    expect(row.status).toBe("done");
  });
});
