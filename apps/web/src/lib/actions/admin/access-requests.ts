"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { reviewAccessRequest } from "@dhaga/ee/access-requests";
import { requireUserId } from "@/lib/auth/guard";
import { getAdminGate } from "@/lib/hosted/gate";
import { notifyAccessApproved } from "@/lib/access/notify";

async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!(await (await getAdminGate()).isAdmin(userId))) throw new Error("Forbidden");
  return userId;
}

export async function approveAccessRequestAction(formData: FormData): Promise<void> {
  const adminUserId = await requireAdmin();
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  await reviewAccessRequest(email, "approved", adminUserId);
  await notifyAccessApproved(email);
  revalidatePath("/app/admin/access-requests");
}

export async function rejectAccessRequestAction(formData: FormData): Promise<void> {
  const adminUserId = await requireAdmin();
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  await reviewAccessRequest(email, "rejected", adminUserId);
  revalidatePath("/app/admin/access-requests");
}
