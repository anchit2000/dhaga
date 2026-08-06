"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";
import { TASK_FILTERS, TASK_STATUS_FILTERS } from "@/utils/constants/tasks";
import { TaskForm } from "./TaskForm";
import { TaskRow } from "./TaskRow";
import type { TaskItem } from "@/lib/repo/tasks";
import type { TaskFilter, TaskStatusFilter } from "@/utils/constants/tasks";

function inScope(item: TaskItem, filter: TaskFilter): boolean {
  if (filter === "general") return !item.contactId && !item.companyId;
  if (filter === "people") return item.contactId !== null;
  if (filter === "companies") return item.companyId !== null;
  return true;
}

export function TaskBoard({ items }: { items: TaskItem[] }): React.ReactElement {
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<TaskStatusFilter>("active");
  const [scope, setScope] = useState<TaskFilter>("all");
  const visible = items.filter((item) =>
    item.status === (status === "active" ? "open" : "done") && inScope(item, scope));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-fog">Work with or without a person attached.</p></div>
        <Button type="button" className="min-h-11" onClick={() => setCreating(true)} disabled={creating}><Plus />New task</Button>
      </div>
      {creating ? <TaskForm onDone={() => setCreating(false)} /> : null}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASK_STATUS_FILTERS.map((filter) => <Button key={filter.value} type="button" size="sm"
            className="min-h-11" variant={status === filter.value ? "default" : "outline"} onClick={() => setStatus(filter.value)}>{filter.label}</Button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASK_FILTERS.map((filter) => <Button key={filter.value} type="button" size="xs"
            className="min-h-11" variant={scope === filter.value ? "secondary" : "ghost"} onClick={() => setScope(filter.value)}>{filter.label}</Button>)}
        </div>
      </div>
      {visible.length ? <ul className="space-y-2">{visible.map((item) => <TaskRow key={item.id} item={item} />)}</ul>
        : <EmptyState title={status === "active" ? "Nothing waiting" : "No completed tasks"}
            body={status === "active" ? "Add a task for yourself, a person, or a company." : "Completed work will collect here."} />}
    </div>
  );
}
