"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import { deleteCalendarConnection, setCalendarWriteEnabled } from "@/lib/repo/calendar";

export async function disconnectCalendarAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const r = await mutation("disconnectCalendar", () => deleteCalendarConnection(id));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

/**
 * Turn write-out on or off for one connection. This is NOT a scope change: the
 * grant stays exactly as the user consented to it, we simply stop writing
 * follow-ups to the Dhaga calendar. Existing events stay where they are — the
 * calendar is the user's to keep or delete.
 */
export async function setCalendarWriteEnabledAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const r = await mutation("setCalendarWriteEnabled", () => setCalendarWriteEnabled(id, enabled));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}
