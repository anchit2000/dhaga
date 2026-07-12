"use server";

// Dhaga Cloud only — see packages/ee/LICENSE.
import { revalidatePath } from "next/cache";
import { setUserAdmin } from "@dhaga/ee/admin";
import { requireUserId } from "@/lib/auth/guard";
import { invalidateAppNavigation } from "@/lib/cache/app-navigation";
import { getAdminGate } from "@/lib/hosted/gate";

export async function setUserAdminAction(formData: FormData): Promise<void> {
  const callerId = await requireUserId();
  if (!(await (await getAdminGate()).isAdmin(callerId))) throw new Error("Forbidden");
  const userId = String(formData.get("userId") ?? "");
  const isAdmin = String(formData.get("isAdmin")) === "true";
  if (!userId) return;
  await setUserAdmin(userId, isAdmin);
  invalidateAppNavigation(userId);
  revalidatePath(`/app/admin/users/${userId}`);
  revalidatePath("/app/admin/users");
}
