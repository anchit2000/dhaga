"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import { AssociationPicker, type SelectedAssociation } from "./AssociationPicker";
import { RecurrenceFields } from "./RecurrenceFields";
import type { TaskItem } from "@/lib/repo/tasks";

export function TaskForm({ task, onDone }: {
  task?: TaskItem;
  onDone: () => void;
}): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dueDate, setDueDate] = useState<Date | null>(task?.dueDate ?? null);
  const [person, setPerson] = useState<SelectedAssociation | null>(
    task?.contactId && task.contactName ? { id: task.contactId, label: task.contactName } : null,
  );
  const [company, setCompany] = useState<SelectedAssociation | null>(
    task?.companyId && task.companyName ? { id: task.companyId, label: task.companyName } : null,
  );

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    const data = new FormData(event.currentTarget);
    if (task) data.set("taskId", task.id);
    if (person) data.set("contactId", person.id);
    if (company) data.set("companyId", company.id);
    const result = task ? await updateTaskAction(data) : await createTaskAction(data);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(task ? "Task updated." : "Task added.");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-seam bg-panel p-4 sm:p-5">
      <Input name="action" required autoFocus defaultValue={task?.action} className="min-h-11"
        placeholder="What needs to be done?" />
      <DatePicker name="dueDate" value={dueDate} onChange={setDueDate} submissionMode="date"
        placeholder="Due date — optional" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AssociationPicker kind="contact" label="Person — optional" value={person} onChange={setPerson} />
        <AssociationPicker kind="company" label="Company — optional" value={company} onChange={setCompany} />
      </div>
      <RecurrenceFields initial={task?.recurrence ?? null} />
      <div className="flex justify-end gap-2">
        <Button type="button" className="min-h-11" variant="ghost" onClick={onDone} disabled={pending}>Cancel</Button>
        <Button type="submit" className="min-h-11" loading={pending}>{task ? "Save" : "Add task"}</Button>
      </div>
    </form>
  );
}
