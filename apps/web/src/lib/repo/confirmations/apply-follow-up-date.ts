import { and, eq } from "drizzle-orm";
import { calendarDayToUtcDate, parseCalendarDate } from "@dhaga/core";

import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import type { FollowUpDatePayload } from "@dhaga/core";

export async function applyFollowUpDate(
  payload: FollowUpDatePayload,
  choice: { followUpDate: string } | undefined,
): Promise<{ kind: "follow_up_date"; followUpId: string }> {
  const selected = choice?.followUpDate;
  if (selected !== payload.scheduledDate && selected !== payload.alternativeDate) {
    throw new Error("follow_up_date confirmation needs one of its offered dates");
  }
  const day = parseCalendarDate(selected);
  if (!day) throw new Error("follow_up_date confirmation contains an invalid date");
  const db = await getDb();
  const updated = await db
    .update(followUps)
    .set({ dueDate: calendarDayToUtcDate(day) })
    .where(and(eq(followUps.id, payload.apply.followUpId), eq(followUps.status, "open")))
    .returning({ id: followUps.id });
  if (updated.length !== 1) throw new Error("follow_up_date target is missing or closed");
  return { kind: "follow_up_date", followUpId: payload.apply.followUpId };
}
