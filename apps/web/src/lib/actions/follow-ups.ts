"use server";

import { revalidatePath } from "next/cache";
import { mutation, type MutationResult } from "@/lib/actions/mutation";
import { scheduleCalendarWriteOut } from "@/lib/calendar/write-out";
import { setFollowUpStatus, updateFollowUp } from "@/lib/repo/notes";

/**
 * Every mutation here calls scheduleCalendarWriteOut with the acting user, so a
 * connection that is upgraded AND write-enabled stays in step: an edited or
 * rescheduled follow-up moves, and a completed or dismissed one is DELETED from
 * the Dhaga calendar rather than lingering there. The sync runs after the
 * response (see lib/calendar/write-out.ts) and never fails the save.
 */

export async function completeFollowUpAction(formData: FormData): Promise<void> {
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!followUpId) return;
  const r = await mutation("completeFollowUp", async (userId) => {
    await setFollowUpStatus(followUpId, "done");
    return userId;
  });
  if (!r.ok) throw new Error(r.error);
  scheduleCalendarWriteOut(r.data, followUpId);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
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
  const parsedDue = dueRaw ? new Date(dueRaw) : null;
  const dueDate = parsedDue && !Number.isNaN(parsedDue.getTime()) ? parsedDue : null;
  const r = await mutation("updateFollowUp", async (userId) => {
    await updateFollowUp(followUpId, { action, dueDate });
    return userId;
  });
  if (!r.ok) throw new Error(r.error);
  scheduleCalendarWriteOut(r.data, followUpId);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
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
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
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
  const r = await mutation("rescheduleFollowUp", async (userId) => {
    await updateFollowUp(input.id, {
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
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
