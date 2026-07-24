/** Morning follow-up reminder email defaults. */

/**
 * Recipient-local hour the reminder targets ("~08:00"). Only enforced when an
 * hourly scheduler drives the job (MORNING_REMINDER_HOURLY) — on Vercel Hobby's
 * single daily cron the one run sends regardless, see lib/jobs/morning-reminder.ts.
 */
export const MORNING_REMINDER_LOCAL_HOUR = 8;
