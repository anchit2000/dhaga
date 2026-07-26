"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { setFollowUpStatus, updateFollowUp } from "@/lib/repo/notes";

export async function completeFollowUpAction(formData: FormData): Promise<void> {
  const followUpId = String(formData.get("followUpId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!followUpId) return;
  const r = await mutation("completeFollowUp", () => setFollowUpStatus(followUpId, "done"));
  if (!r.ok) throw new Error(r.error);
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
  const r = await mutation("updateFollowUp", () =>
    updateFollowUp(followUpId, { action, dueDate }),
  );
  if (!r.ok) throw new Error(r.error);
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
  const r = await mutation("dismissFollowUp", () => setFollowUpStatus(followUpId, "dismissed"));
  if (!r.ok) throw new Error(r.error);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app");
}
