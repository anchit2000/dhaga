import type { TaskItem } from "./types";

export function taskAssociationLabel(task: Pick<
  TaskItem,
  "contactName" | "companyName"
>): string {
  if (task.contactName && task.companyName) return `${task.contactName} · ${task.companyName}`;
  return task.contactName ?? task.companyName ?? "Personal task";
}
