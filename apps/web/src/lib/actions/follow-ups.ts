"use server";

import { revalidatePath } from "next/cache";
import { calendarDayToUtcDate, parseCalendarDate } from "@dhaga/core";
import { mutation, type MutationResult } from "@/lib/actions/mutation";
import { scheduleCalendarWriteOut } from "@/lib/calendar/write-out";
import { setFollowUpStatus, updateFollowUp } from "@/lib/repo/notes";
import type { TaskCompletion } from "@/lib/repo/tasks";

/**
 * Every mutation here calls scheduleCalendarWriteOut with the acting user, so a
 * connection that is upgraded AND write-enabled stays in step: edits and
 * recurring completions move the event, while terminal completions/dismissals
 * delete it. The sync runs after the response (see lib/calendar/write-out.ts)
 * and never fails the save.
 */

function completionInput(formData: FormData): {
  followUpId: string;
  contactId: string;
  expectedDueDate: Date | null;
} {
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const expectedRaw = String(formData.get("expectedDueDate") ?? "").trim();
  return { followUpId, contactId, expectedDueDate: expectedRaw ? new Date(expectedRaw) : null };
}

function revalidateCompletion(userId: string, followUpId: string, contactId: string): void {
  scheduleCalendarWriteOut(userId, followUpId);
  if (contactId) revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  revalidatePath("/app/tasks");
  revalidatePath("/app/follow-ups");
  revalidatePath("/app/calendar");
}

/** Form-compatible completion for list surfaces that refresh after mutation. */
export async function completeFollowUpAction(formData: FormData): Promise<void> {
  const input = completionInput(formData);
  if (!input.followUpId) return;
  const r = await mutation("completeFollowUp", async (userId) => {
    await setFollowUpStatus(input.followUpId, "done", input.expectedDueDate);
    return userId;
  });
  if (!r.ok) throw new Error(r.error);
  revalidateCompletion(r.data, input.followUpId, input.contactId);
}

/** Calendar completion also returns the next occurrence so its imperative event
 * can move without waiting for a route refresh. Null means the row is finished. */
export async function completeCalendarFollowUpAction(
  formData: FormData,
): Promise<{ advancedTo: string | null }> {
  const input = completionInput(formData);
  if (!input.followUpId) return { advancedTo: null };
  const r = await mutation("completeCalendarFollowUp", async (userId) => ({
    completion: await setFollowUpStatus(input.followUpId, "done", input.expectedDueDate),
    userId,
  }));
  if (!r.ok) throw new Error(r.error);
  revalidateCompletion(r.data.userId, input.followUpId, input.contactId);
  const completion: TaskCompletion = r.data.completion;
  return { advancedTo: completion?.advancedTo?.toISOString() ?? null };
}

/**
 * Edit an open follow-up's action text and due date. Manual (no LLM, no AI
 * budget) — the counterpart to createFollowUpAction. The edit form always
 * carries the DatePicker's hidden field, so an empty value clears the date.
 */
export async function updateFollowUpAction(formData: FormData): Promise<void> {
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const action = String(formData.get("action") ?? "").trim();
  if (!followUpId || !action) return;
  const dueRaw = String(formData.get("dueDate") ?? "").trim();
  const calendarDay = dueRaw ? parseCalendarDate(dueRaw) : null;
  const dueDate = calendarDay ? calendarDayToUtcDate(calendarDay) : null;
  const r = await mutation("updateFollowUp", async (userId) => {
    await updateFollowUp(followUpId, { action, dueDate });
    return userId;
  });
  if (!r.ok) throw new Error(r.error);
  scheduleCalendarWriteOut(r.data, followUpId);
  if (contactId) revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}

/**
 * "Delete" a follow-up = soft-dismiss it (status='dismissed'). No follow_ups
 * table has a deletedAt column, and every list filters status='open', so a
 * dismissed row disappears everywhere without a hard delete or schema change —
 * consistent with how the rest of the app retires workflow items.
 */
export async function dismissFollowUpAction(formData: FormData): Promise<void> {
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!followUpId) return;
  const r = await mutation("dismissFollowUp", async (userId) => {
    await setFollowUpStatus(followUpId, "dismissed");
    return userId;
  });
  if (!r.ok) throw new Error(r.error);
  scheduleCalendarWriteOut(r.data, followUpId);
  if (contactId) revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}

/**
 * Reschedule an open follow-up to a new due date (or clear it with null).
 * Manual, from the calendar view. Returns the MutationResult so the caller can
 * toast on failure instead of hitting the error boundary. The calendar carries
 * no contactId, so we revalidate Home (as the siblings do) and the calendar;
 * the contact-detail page is refreshed by updateFollowUpAction where a
 * contactId is in scope.
 */
export async function rescheduleFollowUpAction(input: {
  id: string;
  dueDate: string | null;
}): Promise<MutationResult<void>> {
  const day = input.dueDate ? parseCalendarDate(input.dueDate) : null;
  const r = await mutation("rescheduleFollowUp", async (userId) => {
    await updateFollowUp(input.id, {
      dueDate: day ? calendarDayToUtcDate(day) : null,
    });
    return userId;
  });
  if (r.ok) {
    scheduleCalendarWriteOut(r.data, input.id);
    revalidatePath("/app");
    revalidatePath("/app/calendar");
  }
  return r.ok ? { ok: true, data: undefined } : r;
}
