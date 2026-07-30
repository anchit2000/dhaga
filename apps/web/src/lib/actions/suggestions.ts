"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import {
  getSchedulePrefs,
  setConfirmationsDigestEnabled,
  setDailyDigestEnabled,
  setDailySuggestionCount,
  setImportantDateLeadDays,
  setImportantDateRemindersEnabled,
  setJobEmailNotificationsEnabled,
  setMorningReminderEnabled,
  setSchedulePrefs,
} from "@/lib/repo/suggestion-settings";
import { coerceTimeZone } from "@/lib/time/zone";
import {
  IMPORTANT_DATE_LEAD_DAYS_DEFAULT,
  IMPORTANT_DATE_LEAD_DAYS_MAX,
  IMPORTANT_DATE_LEAD_DAYS_MIN,
} from "@/utils/constants/important-dates";

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
    // Read-then-patch on the same scoped connection: this form carries no
    // timezone field, and rebuilding SchedulePrefs from scratch would reset a
    // zone the user chose in the sibling card back to UTC.
    const current = await getSchedulePrefs();
    await setSchedulePrefs({
      ...current,
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

/**
 * Saves the IANA timezone. Deliberately its own action rather than another field
 * on `setSuggestionSettingsAction`: that action rebuilds the whole SchedulePrefs
 * blob out of its own form fields, so a timezone-only submit would fall back to
 * the code defaults for `startHour`/`endHour`/`overloadThreshold` and silently
 * flatten the user's working-hour window.
 *
 * A zone this runtime doesn't recognise falls back to the STORED zone, not to
 * UTC. A malformed POST (stale client ICU data, a hand-crafted request) should
 * be a no-op; resetting someone's zone because of one is worse than ignoring it.
 */
export async function setTimezoneAction(formData: FormData): Promise<void> {
  const raw = formData.get("timezone");
  const requested = typeof raw === "string" ? raw.trim() : "";
  const r = await mutation("setTimezone", async () => {
    const current = await getSchedulePrefs();
    // Fallback is the zone on record, NOT UTC — see the note above.
    await setSchedulePrefs({ ...current, timezone: coerceTimeZone(requested, current.timezone) });
  });
  if (!r.ok) throw new Error(r.error);
  // Home reads the same prefs for its day-load numbers, so it revalidates too.
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

/** Opt in/out of the email that accompanies a background job's notification. */
export async function setJobEmailNotificationsEnabledAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const r = await mutation("setJobEmailNotificationsEnabled", () =>
    setJobEmailNotificationsEnabled(enabled),
  );
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

export async function setImportantDateRemindersEnabledAction(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "on";
  const r = await mutation("setImportantDateRemindersEnabled", () =>
    setImportantDateRemindersEnabled(enabled),
  );
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/app/settings");
}

/**
 * Saves the birthday/anniversary lead time. Clamped here as well as in the repo
 * setter: the number input's min/max is only a browser hint, and the action is
 * the boundary that decides what a bad value becomes. `numberField` keeps a
 * deliberate 0 ("day-of only") from collapsing into the 7-day default.
 */
export async function setImportantDateLeadDaysAction(formData: FormData): Promise<void> {
  const leadDays = clamp(
    numberField(formData.get("leadDays"), IMPORTANT_DATE_LEAD_DAYS_DEFAULT),
    IMPORTANT_DATE_LEAD_DAYS_MIN,
    IMPORTANT_DATE_LEAD_DAYS_MAX,
  );
  const r = await mutation("setImportantDateLeadDays", () => setImportantDateLeadDays(leadDays));
  if (!r.ok) throw new Error(r.error);
  // The lead time decides which dates count as upcoming on Home too, not just
  // the settings card that wrote it.
  revalidatePath("/app");
  revalidatePath("/app/settings");
}
