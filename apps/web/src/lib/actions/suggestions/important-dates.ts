"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import {
  setImportantDateLeadDays,
  setImportantDateRemindersEnabled,
} from "@/lib/repo/suggestion-settings";
import {
  IMPORTANT_DATE_LEAD_DAYS_DEFAULT,
  IMPORTANT_DATE_LEAD_DAYS_MAX,
  IMPORTANT_DATE_LEAD_DAYS_MIN,
} from "@/utils/constants/important-dates";
import { clamp, numberField } from "./helpers";

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
