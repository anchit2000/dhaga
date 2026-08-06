"use client";

import { useRouter } from "next/navigation";
import { createTaskAction } from "@/lib/actions/tasks";
import { taskInputFromForm } from "@/lib/actions/task-input";
import type { FollowUpRow } from "@/lib/db/schema";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { AddFollowUpForm } from "./AddFollowUpForm";
import { FollowUpItem } from "./FollowUpItem";

/** Open follow-ups plus a manual "Add" path. Adds show optimistically, then
 *  the server write + revalidation reconcile them; a failed write rolls back
 *  with Retry (useOptimisticList). "Mark done" stays a plain server-action
 *  form — completing is out of the optimistic-add scope. */
export function FollowUpList({
  contactId,
  followUps,
}: {
  contactId: string;
  followUps: FollowUpRow[];
}) {
  const router = useRouter();
  const { items, add } = useOptimisticList<FollowUpRow>({
    items: followUps,
    errorMessage: "Couldn't add the follow-up — try again.",
  });

  function handleAdd(data: FormData): void {
    data.set("contactId", contactId);
    const input = taskInputFromForm(data);
    if (typeof input === "string") return;
    const optimisticFollowUp: FollowUpRow = {
      id: `optimistic-${crypto.randomUUID()}`,
      contactId,
      action: input.action,
      dueHint: null,
      dueDate: input.dueDate,
      recurrenceFrequency: input.recurrence?.frequency ?? null,
      recurrenceInterval: input.recurrence?.interval ?? null,
      recurrenceWeekday: input.recurrence?.weekday ?? null,
      recurrenceMonthDay: input.recurrence?.monthDay ?? null,
      recurrenceMonth: input.recurrence?.month ?? null,
      status: "open",
      sourceNoteId: null,
      createdAt: new Date(),
    };
    add(optimisticFollowUp, async () => {
      const result = await createTaskAction(data);
      if (!result.ok) return result.error;
      router.refresh();
      return null;
    });
  }

  return (
    <div>
      <h2 className="mb-2 font-display text-lg">Follow-ups</h2>
      {items.length > 0 ? (
        <ul className="mb-2 space-y-1.5">
          {items.map((followUp) => (
            <FollowUpItem key={followUp.id} contactId={contactId} followUp={followUp} />
          ))}
        </ul>
      ) : null}
      <AddFollowUpForm onAdd={handleAdd} />
    </div>
  );
}
