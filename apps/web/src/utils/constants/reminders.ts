/** Morning follow-up reminder email defaults. */

/**
 * Recipient-local hour the daily email jobs target ("~08:00"), evaluated in the
 * tenant's own timezone. Only enforced when an hourly scheduler drives them
 * (REMINDER_HOUR_GATE_ENV_VARS) — on Vercel Hobby's single daily cron the one run
 * sends regardless, see lib/jobs/last-run.ts.
 */
export const MORNING_REMINDER_LOCAL_HOUR = 8;

/**
 * Env vars that switch ON the recipient-local-hour gate for the daily email jobs
 * (morning reminder, reach-out digest, confirmations digest). OPT-IN by design:
 * with none of them set — the Vercel Hobby default of one cron a day — the single
 * run always sends, so the gate can never silence the only invocation the day
 * gets. Set one to "true" only when an hourly scheduler drives /api/jobs/daily;
 * the jobs then send solely on the run that matches MORNING_REMINDER_LOCAL_HOUR
 * in each tenant's own timezone. Hourly delivery is therefore a config change,
 * not a rewrite.
 *
 * `MORNING_REMINDER_HOURLY` is the original, morning-reminder-only name, still
 * honoured for one release so an existing deploy that sets it does not silently
 * change behaviour; it now gates all three jobs, which for an hourly deploy is
 * strictly a fix (the other two had no hour gate and so fired every hour).
 * `EMAIL_JOBS_HOURLY` is the name to use.
 */
export const REMINDER_HOUR_GATE_ENV_VARS = ["EMAIL_JOBS_HOURLY", "MORNING_REMINDER_HOURLY"] as const;

/**
 * Per-job identity for the "already emailed this tenant today" record in
 * lib/jobs/last-run.ts (it becomes the `<key>_last_local_day` settings key).
 * Named after the existing `*_enabled` opt-in keys so a settings row is readable
 * at a glance.
 */
export const DAILY_EMAIL_JOB_KEYS = {
  morningReminder: "morning_reminder",
  dailyDigest: "daily_digest",
  confirmationsDigest: "confirmations_digest",
} as const;

/**
 * How far ahead the follow-up reminder EMAIL looks. The nav bell deliberately
 * stays on overdue + due-today (its badge means "act now"), but an email that
 * only ever lists today's work lands too late to act on — a follow-up due in
 * three days was never emailed at all before this window existed. Fixed, not
 * user-tunable: only the important-date lead time is a per-user setting
 * (constants/important-dates.ts).
 */
export const FOLLOW_UP_LEAD_DAYS = 3;
