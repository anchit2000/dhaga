import {
  calendarDayToUtcDate,
  isRecurrenceRule,
  parseCalendarDate,
} from "@dhaga/core/src/dates";
import type { RecurrenceFrequency, RecurrenceRule } from "@dhaga/core/src/dates";
import type { TaskInput } from "@/lib/repo/tasks";

function optionalId(value: FormDataEntryValue | null): string | null {
  const id = String(value ?? "").trim();
  return id || null;
}

function optionalInteger(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isInteger(number) ? number : null;
}

function recurrenceFromForm(formData: FormData): RecurrenceRule | null {
  const frequency = String(formData.get("recurrenceFrequency") ?? "").trim();
  if (!frequency) return null;
  const rule: RecurrenceRule = {
    frequency: frequency as RecurrenceFrequency,
    interval: optionalInteger(formData.get("recurrenceInterval")) ?? 1,
    weekday: optionalInteger(formData.get("recurrenceWeekday")),
    monthDay: optionalInteger(formData.get("recurrenceMonthDay")),
    month: optionalInteger(formData.get("recurrenceMonth")),
  };
  return isRecurrenceRule(rule) ? rule : null;
}

export function taskInputFromForm(formData: FormData): TaskInput | string {
  const action = String(formData.get("action") ?? "").trim();
  if (!action) return "Describe the task first.";
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const calendarDay = dueRaw ? parseCalendarDate(dueRaw) : null;
  if (dueRaw && !calendarDay) return "Choose a valid due date.";
  const parsedDue = calendarDay ? calendarDayToUtcDate(calendarDay) : null;
  const recurrence = recurrenceFromForm(formData);
  if (formData.get("recurrenceFrequency") && !recurrence) return "Choose a valid repeat schedule.";
  if (recurrence && !parsedDue) return "Choose a due date for a repeating task.";
  return {
    action,
    dueDate: parsedDue,
    contactId: optionalId(formData.get("contactId")),
    companyId: optionalId(formData.get("companyId")),
    recurrence,
  };
}
