"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { deleteCalendarConnection } from "@/lib/repo/calendar";

export async function disconnectCalendarAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const r = await mutation("disconnectCalendar", () => deleteCalendarConnection(id));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}
