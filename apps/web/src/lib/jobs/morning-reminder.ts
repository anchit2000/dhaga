import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { morningReminderHtml } from "@/lib/email/morning-reminder";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { getPendingReminderSummary } from "@/lib/repo/reminders";
import { getSchedulePrefs, isMorningReminderEnabled } from "@/lib/repo/suggestion-settings";
import { MORNING_REMINDER_LOCAL_HOUR } from "@/utils/constants/reminders";

export interface MorningReminderSummary {
  sent: boolean;
  pending: number;
  skipped?:
    | "not_enabled"
    | "no_email"
    | "no_owner"
    | "dummy_recipient"
    | "not_local_morning"
    | "empty"
    | "send_failed";
}

/** True when it is currently the recipient's local morning hour (~08:00). */
function isLocalMorning(now: Date, utcOffsetMinutes: number): boolean {
  const localHour = new Date(now.getTime() + utcOffsetMinutes * 60_000).getUTCHours();
  return localHour === MORNING_REMINDER_LOCAL_HOUR;
}

/**
 * Daily "you have follow-ups waiting — open Dhaga" reminder. Opt-in
 * (isMorningReminderEnabled), template-only (no AI, no metered cost), and runs
 * on the default connection like the reach-out digest — a per-user fan-out (now
 * implemented for the signal-detection job) is a remaining follow-up for these
 * email jobs (see docs/FOLLOW_UPS.md).
 *
 * TIMEZONE: to deliver at ~08:00 in the recipient's local time the operator must
 * drive this endpoint hourly and set MORNING_REMINDER_HOURLY=true — the job then
 * only sends on the run that matches the recipient's local morning (so still once
 * a day). On Vercel Hobby's single daily cron the flag stays unset and the one
 * run always sends, landing at whatever UTC hour that cron fires. Reuses the
 * browser-captured schedule offset; a proper IANA timezone + explicit capture UX
 * is a follow-up.
 */
export async function runMorningReminder(now: Date = new Date()): Promise<MorningReminderSummary> {
  if (!(await isMorningReminderEnabled())) return { sent: false, pending: 0, skipped: "not_enabled" };
  if (!emailEnabled()) return { sent: false, pending: 0, skipped: "no_email" };

  const recipient = ownerEmail();
  if (!recipient) return { sent: false, pending: 0, skipped: "no_owner" };
  // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
  if (isDummyAccount({ email: recipient })) return { sent: false, pending: 0, skipped: "dummy_recipient" };

  const prefs = await getSchedulePrefs();
  if (process.env.MORNING_REMINDER_HOURLY === "true" && !isLocalMorning(now, prefs.utcOffsetMinutes)) {
    return { sent: false, pending: 0, skipped: "not_local_morning" };
  }

  const { openFollowUps, dueReachOuts } = await getPendingReminderSummary();
  const pending = openFollowUps + dueReachOuts;
  if (pending === 0) return { sent: false, pending: 0, skipped: "empty" };

  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app`;
  const html = emailShell("Your follow-ups today", morningReminderHtml({ openFollowUps, dueReachOuts, appUrl }));
  const subject = `You have ${pending} reminder${pending === 1 ? "" : "s"} in Dhaga`;
  const result = await sendEmail({ to: recipient, subject, html });
  return result.ok ? { sent: true, pending } : { sent: false, pending, skipped: "send_failed" };
}
