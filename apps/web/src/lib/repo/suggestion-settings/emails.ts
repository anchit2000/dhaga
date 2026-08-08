import { getSetting, seedSettings, setSetting } from "../settings";
import {
  IMPORTANT_DATE_LEAD_DAYS_DEFAULT,
  IMPORTANT_DATE_LEAD_DAYS_MAX,
  IMPORTANT_DATE_LEAD_DAYS_MIN,
} from "@/utils/constants/important-dates";

/**
 * Per-user email preferences, on the same key/value settings table as the
 * scheduling scalars next door.
 *
 * New accounts are SEEDED "on" at signup (seedEmailPreferences below), but every
 * getter still resolves a MISSING row to OFF. That floor is what stops the seed
 * reaching back in time: accounts predating it, and any whose seed failed, stay
 * silent until they opt in. "Default off" now means "off unless there's a row".
 */

const DAILY_DIGEST_KEY = "daily_digest_enabled";
const CONFIRMATIONS_DIGEST_KEY = "confirmations_digest_enabled";
const MORNING_REMINDER_KEY = "morning_reminder_enabled";
const IMPORTANT_DATE_REMINDERS_KEY = "important_date_reminders_enabled";
export const IMPORTANT_DATE_LEAD_DAYS_KEY = "important_date_lead_days";
const JOB_EMAIL_KEY = "job_email_notifications_enabled";
const JOB_EMAIL_LAST_SENT_KEY = "job_email_last_sent_at";

/** Whether the user opted into the morning email digest (default: off). */
export async function isDailyDigestEnabled(): Promise<boolean> {
  return (await getSetting(DAILY_DIGEST_KEY)) === "on";
}

export async function setDailyDigestEnabled(enabled: boolean): Promise<void> {
  await setSetting(DAILY_DIGEST_KEY, enabled ? "on" : "off");
}

/** Whether the user opted into the pending-confirmations email digest (default: off). */
export async function isConfirmationsDigestEnabled(): Promise<boolean> {
  return (await getSetting(CONFIRMATIONS_DIGEST_KEY)) === "on";
}

export async function setConfirmationsDigestEnabled(enabled: boolean): Promise<void> {
  await setSetting(CONFIRMATIONS_DIGEST_KEY, enabled ? "on" : "off");
}

/**
 * Whether the user opted into the morning follow-up reminder email — a daily
 * nudge to open Dhaga when items are pending (default: off; privacy-first, we
 * never email a user who hasn't asked to be emailed).
 */
export async function isMorningReminderEnabled(): Promise<boolean> {
  return (await getSetting(MORNING_REMINDER_KEY)) === "on";
}

export async function setMorningReminderEnabled(enabled: boolean): Promise<void> {
  await setSetting(MORNING_REMINDER_KEY, enabled ? "on" : "off");
}

/**
 * Whether the user opted into birthday/anniversary reminders (default: off).
 * Off by default like every other reminder here — important dates come from
 * imports the user never reviewed, so opting them in silently would surface a
 * stream of dates they did not ask to be reminded about.
 */
export async function getImportantDateRemindersEnabled(): Promise<boolean> {
  return (await getSetting(IMPORTANT_DATE_REMINDERS_KEY)) === "on";
}

export async function setImportantDateRemindersEnabled(enabled: boolean): Promise<void> {
  await setSetting(IMPORTANT_DATE_REMINDERS_KEY, enabled ? "on" : "off");
}

function clampLeadDays(value: number): number {
  return Math.min(
    IMPORTANT_DATE_LEAD_DAYS_MAX,
    Math.max(IMPORTANT_DATE_LEAD_DAYS_MIN, Math.round(value)),
  );
}

/** Pure: stored string → lead days. Exported so a batched read (./bundle.ts)
 *  parses the same value it would have fetched on its own round-trip. */
export function parseImportantDateLeadDays(raw: string | null | undefined): number {
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? clampLeadDays(parsed) : IMPORTANT_DATE_LEAD_DAYS_DEFAULT;
}

/** How many days ahead an important date counts as upcoming (default 7). */
export async function getImportantDateLeadDays(): Promise<number> {
  return parseImportantDateLeadDays(await getSetting(IMPORTANT_DATE_LEAD_DAYS_KEY));
}

export async function setImportantDateLeadDays(days: number): Promise<void> {
  await setSetting(IMPORTANT_DATE_LEAD_DAYS_KEY, String(clampLeadDays(days)));
}

/**
 * Whether the user opted into being emailed when a background extraction or
 * enrichment job needs their attention (default: off — same privacy-first rule
 * as every toggle above). The in-app notification is written either way; this
 * only decides whether the same event also leaves the app.
 */
export async function isJobEmailNotificationsEnabled(): Promise<boolean> {
  return (await getSetting(JOB_EMAIL_KEY)) === "on";
}

export async function setJobEmailNotificationsEnabled(enabled: boolean): Promise<void> {
  await setSetting(JOB_EMAIL_KEY, enabled ? "on" : "off");
}

/**
 * When the last job email went out (epoch ms), or null if none ever has. This
 * is the ONLY state behind the anti-flood window in repo/notifications/job-email
 * — a burst of jobs (five notes pasted in a row, or one broken API key failing
 * every one of them) must not become a burst of emails.
 *
 * A malformed value reads as null: worst case one extra email, versus a
 * permanently silenced channel if a bad parse were treated as "sent just now".
 */
export async function getJobEmailLastSentAt(): Promise<number | null> {
  const raw = await getSetting(JOB_EMAIL_LAST_SENT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export async function setJobEmailLastSentAt(epochMs: number): Promise<void> {
  await setSetting(JOB_EMAIL_LAST_SENT_KEY, String(Math.round(epochMs)));
}

/** The toggles a brand-new account starts with switched on. Deliberately every
 *  reminder in this file and nothing else: the lead-days scalar and the
 *  last-sent timestamp are not preferences. */
const SEEDED_EMAIL_PREFERENCE_KEYS = [
  DAILY_DIGEST_KEY,
  CONFIRMATIONS_DIGEST_KEY,
  MORNING_REMINDER_KEY,
  IMPORTANT_DATE_REMINDERS_KEY,
  JOB_EMAIL_KEY,
] as const;

/**
 * Switch every email reminder on for the CURRENT tenant scope — called once per
 * account from the signup hook, which is the only thing that decides who gets
 * seeded. Insert-if-absent (see seedSettings), so it can never overwrite a
 * choice: re-running it on an account that has since turned the digest off
 * leaves that "off" alone.
 */
export async function seedEmailPreferences(): Promise<void> {
  await seedSettings(SEEDED_EMAIL_PREFERENCE_KEYS.map((key) => [key, "on"] as const));
}
