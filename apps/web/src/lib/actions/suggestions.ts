"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/guard";
import {
  setDailyDigestEnabled,
  setDailySuggestionCount,
  setSchedulePrefs,
} from "@/lib/repo/suggestion-settings";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Saves the daily count + scheduling window in one form submit. */
export async function setSuggestionSettingsAction(formData: FormData): Promise<void> {
  await requireUserId();
  const count = Number(formData.get("count"));
  if (Number.isFinite(count)) await setDailySuggestionCount(count); // repo clamps range
  const startHour = clamp(Number(formData.get("startHour")) || 9, 0, 23);
  const endHour = clamp(Number(formData.get("endHour")) || 17, 1, 24);
  const overloadThreshold = clamp(Number(formData.get("overloadThreshold")) || 5, 1, 24);
  const utcOffsetMinutes = clamp(Number(formData.get("utcOffsetMinutes")) || 0, -840, 840);
  await setSchedulePrefs({
    startHour,
    endHour: Math.max(endHour, startHour + 1),
    overloadThreshold,
    utcOffsetMinutes,
  });
  revalidatePath("/app");
  revalidatePath("/app/settings");
}

export async function setDailyDigestEnabledAction(formData: FormData): Promise<void> {
  await requireUserId();
  await setDailyDigestEnabled(formData.get("enabled") === "on");
  revalidatePath("/app/settings");
}
