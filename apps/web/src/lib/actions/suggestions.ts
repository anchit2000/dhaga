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

/**
 * Parse a numeric form field, falling back to `fallback` only when the value
 * is genuinely absent or non-numeric — NOT for a legitimate 0. `Number(x) ||
 * fallback` would coerce a valid 0 (e.g. a midnight startHour) to the default;
 * an explicit finite check preserves it.
 */
function numberField(raw: FormDataEntryValue | null, fallback: number): number {
  if (raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Saves the daily count + scheduling window in one form submit. */
export async function setSuggestionSettingsAction(formData: FormData): Promise<void> {
  await requireUserId();
  const count = Number(formData.get("count"));
  if (Number.isFinite(count)) await setDailySuggestionCount(count); // repo clamps range
  const startHour = clamp(numberField(formData.get("startHour"), 9), 0, 23);
  const endHour = clamp(numberField(formData.get("endHour"), 17), 1, 24);
  const overloadThreshold = clamp(numberField(formData.get("overloadThreshold"), 5), 1, 24);
  const utcOffsetMinutes = clamp(numberField(formData.get("utcOffsetMinutes"), 0), -840, 840);
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
