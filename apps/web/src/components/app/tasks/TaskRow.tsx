"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeTaskAction, deleteTaskAction } from "@/lib/actions/tasks";
import { RECURRENCE_UNIT_LABELS } from "@/utils/constants/tasks";
import { companyFilteredHref } from "@/utils/company-href";
import { formatDueDate } from "@/utils/format-date";
import { TaskForm } from "./TaskForm";
import type { TaskItem } from "@/lib/repo/tasks";

function recurrenceLabel(item: TaskItem): string | null {
  if (!item.recurrence) return null;
  const interval = item.recurrence.interval;
  const unit = RECURRENCE_UNIT_LABELS[item.recurrence.frequency];
  return interval === 1 ? item.recurrence.frequency : `Every ${interval} ${unit}s`;
}

export function TaskRow({ item }: { item: TaskItem }): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"complete" | "delete" | null>(null);
  if (editing) return <li><TaskForm task={item} onDone={() => setEditing(false)} /></li>;

  async function complete(): Promise<void> {
    setPending("complete");
    const result = await completeTaskAction(item.id, item.dueDate?.toISOString() ?? null);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.data.advancedTo ? `Next occurrence: ${formatDueDate(result.data.advancedTo)}` : "Task completed.");
  }

  async function remove(): Promise<void> {
    setPending("delete");
    const result = await deleteTaskAction(item.id);
    setPending(null);
    if (result.ok) toast.success("Task deleted.");
    else toast.error(result.error);
  }

  return (
    <li className="flex items-start gap-3 rounded-2xl border border-seam bg-panel p-4">
      {item.status === "open" ? (
        <Button type="button" variant="ghost" size="icon-sm" loading={pending === "complete"}
          className="min-h-11 min-w-11" aria-label="Complete task" onClick={complete}><Check /></Button>
      ) : <span className="mt-1 size-2 rounded-full bg-amber" aria-label="Completed" />}
      <div className="min-w-0 flex-1">
        <p className={item.status === "done" ? "text-sm text-fog line-through" : "text-sm text-paper"}>{item.action}</p>
        {/* items-center, not the default stretch: the contact/company links
            carry a 44px touch target, so an un-centred row leaves the plain
            due-date text pinned to the top of a 44px line while the link sits
            in its middle — the two read as ragged, misaligned rows. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fog">
          {item.dueDate ? <span>{formatDueDate(item.dueDate)}</span> : <span>Unscheduled</span>}
          {recurrenceLabel(item) ? <span>· {recurrenceLabel(item)}</span> : null}
          {item.contactId && item.contactName ? <Link className="inline-flex min-h-11 items-center text-ember hover:underline" href={`/app/people/${item.contactId}`}>{item.contactName}</Link> : null}
          {item.companyId && item.companyName ? <Link className="inline-flex min-h-11 items-center text-ember hover:underline" href={companyFilteredHref(item.companyName)}>{item.companyName}</Link> : null}
        </div>
      </div>
      {item.status === "open" ? <Button type="button" variant="ghost" size="icon-sm" className="min-h-11 min-w-11" aria-label="Edit task" onClick={() => setEditing(true)}><Pencil /></Button> : null}
      <Button type="button" variant="ghost" size="icon-sm" loading={pending === "delete"}
        className="min-h-11 min-w-11 text-fog hover:text-destructive" aria-label="Delete task" onClick={remove}><Trash2 /></Button>
    </li>
  );
}
