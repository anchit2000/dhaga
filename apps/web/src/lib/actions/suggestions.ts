"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import {
  setConfirmationsDigestEnabled,
  setDailyDigestEnabled,
  setDailySuggestionCount,
  setMorningReminderEnabled,
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
  const count = Number(formData.get("count"));
  const startHour = clamp(numberField(formData.get("startHour"), 9), 0, 23);
  const endHour = clamp(numberField(formData.get("endHour"), 17), 1, 24);
  const overloadThreshold = clamp(numberField(formData.get("overloadThreshold"), 5), 1, 24);
  const utcOffsetMinutes = clamp(numberField(formData.get("utcOffsetMinutes"), 0), -840, 840);
  // Both writes share ONE scoped connection so the two setSetting() calls don't
  // fan out getDb() across the small tenant pool.
  const r = await mutation("setSuggestionSettings", async () => {
    if (Number.isFinite(count)) await setDailySuggestionCount(count); // repo clamps range
    await setSchedulePrefs({
      startHour,
      endHour: Math.max(endHour, startHour + 1),
      overloadThreshold,
      utcOffsetMinutes,
    });
  });
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app");
  revalidatePath("/app/settings");
}

export async function setDailyDigestEnabledAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const r = await mutation("setDailyDigestEnabled", () => setDailyDigestEnabled(enabled));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

export async function setConfirmationsDigestEnabledAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const r = await mutation("setConfirmationsDigestEnabled", () =>
    setConfirmationsDigestEnabled(enabled),
  );
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

export async function setMorningReminderEnabledAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const r = await mutation("setMorningReminderEnabled", () => setMorningReminderEnabled(enabled));
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}
