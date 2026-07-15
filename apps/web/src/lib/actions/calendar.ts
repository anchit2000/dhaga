"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import { deleteCalendarConnection } from "@/lib/repo/calendar";

export async function disconnectCalendarAction(formData: FormData): Promise<void> {
  await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCalendarConnection(id);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}
