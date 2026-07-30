import { emailEnabled, emailShell, ownerEmail, sendEmail } from "@/lib/email/send";
import { morningReminderHtml } from "@/lib/email/morning-reminder";
import { isDummyAccount } from "@/lib/access/dummy-accounts";
import { logActionError } from "@/lib/actions/resilience";
import { withUserDb } from "@/lib/db/request-scope";
import { hostedTenants, runOnGlobal } from "@/lib/hosted/tenants";
import { hasRunForLocalDay, isHourGateEnabled, markRanForLocalDay } from "@/lib/jobs/last-run";
import { getPendingReminderSummary } from "@/lib/repo/reminders";
import { getSchedulePrefs, isMorningReminderEnabled } from "@/lib/repo/suggestion-settings";
import { isLocalHour, localDayKey } from "@/lib/time/zone";
import { DAILY_EMAIL_JOB_KEYS, MORNING_REMINDER_LOCAL_HOUR } from "@/utils/constants/reminders";
import type { ScopedRunner } from "@/lib/hosted/tenants";

/** Subject line for the morning reminder (pure — unit-tested). */
export function morningReminderSubject(pending: number): string {
  return `You have ${pending} reminder${pending === 1 ? "" : "s"} in Dhaga`;
}

export interface MorningReminderSummary {
  sent: number; // emails sent this run
  skipped: "no_email" | "no_owner" | null;
}

/**
 * Daily "you have follow-ups waiting — open Dhaga" reminder. Opt-in
 * (`morning_reminder_enabled`, default OFF — we never email a user who hasn't
 * asked to be emailed), template-only (no AI, no metered cost).
 *
 * In hosted mode it fans out per tenant inside `withUserDb` so every read is
 * RLS-scoped, mirroring follow-up-reminders / linkedin-export-reminders. That
 * fan-out IS the fix, not a refactor: on the old unscoped connection the settings
 * read returned zero rows under RLS, so `isMorningReminderEnabled()` answered
 * `false` for every hosted tenant and this email could never send for a paying
 * user. Self-host runs once for the configured owner, unchanged.
 *
 * TIMEZONE / DUPLICATES: see lib/jobs/last-run.ts. The local-hour gate is opt-in
 * (an hourly scheduler + EMAIL_JOBS_HOURLY), so on the single daily Hobby cron the
 * one run still sends; the per-tenant local-day record is unconditional, so
 * re-triggering the cron cannot email anyone twice in one of their days.
 */
export async function runMorningReminder(now: Date = new Date()): Promise<MorningReminderSummary> {
  if (!emailEnabled()) return { sent: 0, skipped: "no_email" };

  const appUrl = `${process.env.BETTER_AUTH_URL ?? ""}/app`;
  const tenants = await hostedTenants();

  // Self-host / core-only: one sweep for the configured owner.
  if (tenants === null) {
    const recipient = ownerEmail();
    if (!recipient) return { sent: 0, skipped: "no_owner" };
    // Never email disposable test/demo accounts (load-test user, @dhaga.internal).
    if (isDummyAccount({ email: recipient })) return { sent: 0, skipped: null };
    const sent = await sweepUser(runOnGlobal, recipient, appUrl, now);
    return { sent: sent ? 1 : 0, skipped: null };
  }

  // Hosted (RLS on): sweep each tenant inside its own scope. One tenant failing
  // must never abort the rest (best-effort, mirroring follow-up-reminders).
  let sent = 0;
  for (const t of tenants) {
    if (isDummyAccount({ email: t.email, id: t.id })) continue;
    try {
      if (await sweepUser((work) => withUserDb(t.id, work), t.email, appUrl, now)) sent++;
    } catch (error) {
      // Isolate the tenant: logActionError records only { code, name, transient },
      // never the error body (which could echo contact-derived text — privacy rule).
      logActionError("morning-reminder", error);
    }
  }
  return { sent, skipped: null };
}

/**
 * One tenant's sweep. `runScoped` decides where the DB reads/writes land (global
 * in self-host, one RLS transaction per unit in hosted); the single sendEmail call
 * runs between those units, never inside one, so no connection is held across the
 * network (connection hygiene, mirroring follow-up-reminders).
 */
async function sweepUser(
  runScoped: ScopedRunner,
  recipient: string,
  appUrl: string,
  now: Date,
): Promise<boolean> {
  if (!(await runScoped(() => isMorningReminderEnabled()))) return false;

  // The tenant's OWN timezone drives both gates — an IANA zone, so DST is handled
  // rather than being an hour out for eight months of the year.
  const prefs = await runScoped(() => getSchedulePrefs());
  if (isHourGateEnabled() && !isLocalHour(now, prefs.timezone, MORNING_REMINDER_LOCAL_HOUR)) {
    return false;
  }
  const dayKey = localDayKey(now, prefs.timezone);
  if (await runScoped(() => hasRunForLocalDay(DAILY_EMAIL_JOB_KEYS.morningReminder, dayKey))) {
    return false;
  }

  const { openFollowUps, dueReachOuts } = await runScoped(() => getPendingReminderSummary());
  const pending = openFollowUps + dueReachOuts;
  if (pending === 0) return false; // nothing to say — an empty nudge is noise

  const subject = morningReminderSubject(pending);
  const html = emailShell(
    "Your follow-ups today",
    morningReminderHtml({ openFollowUps, dueReachOuts, appUrl }),
  );
  const result = await sendEmail({ to: recipient, subject, html });
  if (!result.ok) return false; // mark nothing — the next run retries

  await runScoped(() => markRanForLocalDay(DAILY_EMAIL_JOB_KEYS.morningReminder, dayKey));
  return true;
}
