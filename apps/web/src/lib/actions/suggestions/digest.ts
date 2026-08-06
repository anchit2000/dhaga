"use server";

import { revalidatePath } from "next/cache";
import { mutation } from "@/lib/actions/mutation";
import {
  setConfirmationsDigestEnabled,
  setDailyDigestEnabled,
  setJobEmailNotificationsEnabled,
  setMorningReminderEnabled,
} from "@/lib/repo/suggestion-settings";

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
