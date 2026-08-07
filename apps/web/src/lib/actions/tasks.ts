"use server";

import { revalidatePath } from "next/cache";
import { mutation, MutationError, type MutationResult } from "@/lib/actions/mutation";
import { scheduleCalendarWriteOut } from "@/lib/calendar/write-out";
import { PreconditionError } from "@/lib/repo/errors";
import { completeTask, createTask, deleteTask, updateTask } from "@/lib/repo/tasks";
import { taskInputFromForm } from "./task-input";
import type { TaskCompletion, TaskInput } from "@/lib/repo/tasks";

function revalidateTaskPaths(contactId?: string | null): void {
  revalidatePath("/app");
  revalidatePath("/app/tasks");
  revalidatePath("/app/follow-ups");
  revalidatePath("/app/calendar");
  if (contactId) revalidatePath(`/app/people/${contactId}`);
}

async function surfacePrecondition<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PreconditionError) throw new MutationError(error.message);
    throw error;
  }
}

function parseInput(formData: FormData): TaskInput | MutationResult<never> {
  const input = taskInputFromForm(formData);
  return typeof input === "string" ? { ok: false, error: input } : input;
}

export async function createTaskAction(
  formData: FormData,
): Promise<MutationResult<{ id: string }>> {
  const input = parseInput(formData);
  if ("ok" in input) return input;
  const result = await mutation("createTask", async (userId) => ({
    userId,
    id: await surfacePrecondition(() => createTask(userId, input)),
  }));
  if (result.ok) {
    scheduleCalendarWriteOut(result.data.userId, result.data.id);
    revalidateTaskPaths(input.contactId);
  }
  return result.ok ? { ok: true, data: { id: result.data.id } } : result;
}

export async function updateTaskAction(formData: FormData): Promise<MutationResult<void>> {
  const id = String(formData.get("taskId") ?? "");
  const input = parseInput(formData);
  if (!id) return { ok: false, error: "Task not found." };
  if ("ok" in input) return input;
  const result = await mutation("updateTask", async (userId) => {
    await surfacePrecondition(() => updateTask(id, input));
    return userId;
  });
  if (result.ok) scheduleCalendarWriteOut(result.data, id);
  if (result.ok) revalidateTaskPaths(input.contactId);
  return result.ok ? { ok: true, data: undefined } : result;
}

export async function completeTaskAction(
  id: string,
  expectedOccurrence: string | null,
): Promise<MutationResult<TaskCompletion>> {
  const expected = expectedOccurrence ? new Date(expectedOccurrence) : null;
  const result = await mutation("completeTask", async (userId) => ({
    userId,
    completion: await surfacePrecondition(() => completeTask(id, expected)),
  }));
  if (!result.ok) return result;
  scheduleCalendarWriteOut(result.data.userId, id);
  revalidateTaskPaths();
  return { ok: true, data: result.data.completion };
}

export async function deleteTaskAction(id: string): Promise<MutationResult<void>> {
  const result = await mutation("deleteTask", async (userId) => {
    await deleteTask(id);
    return userId;
  });
  if (result.ok) scheduleCalendarWriteOut(result.data, id);
  if (result.ok) revalidateTaskPaths();
  return result.ok ? { ok: true, data: undefined } : result;
}
