"use client";

import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/app/EmptyState";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/follow-ups";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import type { OpenFollowUpItem } from "@/lib/repo/reminders";
import { OpenFollowUpRow } from "./OpenFollowUpRow";

/** The whole open-follow-ups block. Complete and dismiss remove the row
 *  optimistically (useOptimisticList) and fire the server action in the
 *  background — no waiting on the round-trip. The header count and empty state
 *  live here too so they track the optimistic items, not stale server data. A
 *  failed write rolls the row back with a Retry toast. */
export function OpenFollowUpsList({ followUps }: { followUps: OpenFollowUpItem[] }) {
  const router = useRouter();
  const { items, remove } = useOptimisticList<OpenFollowUpItem>({
    items: followUps,
    errorMessage: "Couldn't update that follow-up — try again.",
  });

  function handleRemove(
    item: OpenFollowUpItem,
    action: (formData: FormData) => Promise<void>,
  ): void {
    remove(item, async () => {
      const data = new FormData();
      data.set("followUpId", item.id);
      data.set("contactId", item.contactId ?? "");
      data.set("expectedDueDate", item.dueDate?.toISOString() ?? "");
      await action(data);
      // The actions revalidate /app and the contact page, not this route —
      // refresh so this list's server data drops the row and reconciles.
      router.refresh();
      return null;
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">Follow-ups</h1>
        {items.length > 0 ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-fog">
            {items.length} open
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState title="All caught up" body="Reminders and note-derived follow-ups will collect here." />
      ) : (
        <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
          {items.map((item) => (
            <OpenFollowUpRow
              key={item.id}
              item={item}
              onComplete={() => handleRemove(item, completeFollowUpAction)}
              onDismiss={() => handleRemove(item, dismissFollowUpAction)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
