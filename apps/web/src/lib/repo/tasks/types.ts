import type { RecurrenceRule } from "@dhaga/core";

export interface TaskItem {
  id: string;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  action: string;
  dueHint: string | null;
  dueDate: Date | null;
  recurrence: RecurrenceRule | null;
  status: "open" | "done";
  createdAt: Date;
}

export interface TaskInput {
  action: string;
  dueDate: Date | null;
  contactId: string | null;
  companyId: string | null;
  recurrence: RecurrenceRule | null;
}

export interface TaskCompletion {
  advancedTo: Date | null;
  changed: boolean;
}
