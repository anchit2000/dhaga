"use client";

import { useRouter } from "next/navigation";
import { createFollowUpAction } from "@/lib/actions/manual-entries";
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

  function handleAdd(action: string, dueDate: Date | null): void {
    const optimisticFollowUp: FollowUpRow = {
      id: `optimistic-${crypto.randomUUID()}`,
      contactId,
      action,
      dueHint: null,
      dueDate,
      status: "open",
      sourceNoteId: null,
      createdAt: new Date(),
    };
    add(optimisticFollowUp, async () => {
      const data = new FormData();
      data.set("contactId", contactId);
      data.set("action", action);
      if (dueDate) data.set("dueDate", dueDate.toISOString());
      const result = await createFollowUpAction({}, data);
      if (result.error) return result.error;
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
