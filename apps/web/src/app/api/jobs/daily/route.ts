import { runConfirmationsDigest } from "@/lib/jobs/confirmations-digest";
import { runDailyDigest } from "@/lib/jobs/daily-digest";
import { runFollowUpReminders } from "@/lib/jobs/follow-up-reminders";
import { runImportantDateReminders } from "@/lib/jobs/important-date-reminders";
import { runLinkedinExportReminders } from "@/lib/jobs/linkedin-export-reminders";
import { runMessagingFlush } from "@/lib/jobs/messaging-flush";
import { runMorningReminder } from "@/lib/jobs/morning-reminder";
import { runSignalDetection } from "@/lib/jobs/detect-signals";

/**
 * The single daily-jobs entrypoint. Vercel Hobby allows only one cron, so all
 * once-a-day work runs here: the messaging idle-flush (the guaranteed daily
 * floor for auto-saving quiet capture batches — a Vercel-Pro/system cron can
 * additionally drive api/jobs/messaging/flush every ~15 min), signal detection,
 * the reach-out digest, the confirmations digest, the morning follow-up
 * reminder, the due-follow-up reminder sweep, the birthday/anniversary reminder
 * sweep, and the LinkedIn export reminders.
 * It's a plain authenticated GET —
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * (apps/web/vercel.json), and off Vercel ANY scheduler (system crontab, GitHub
 * Actions, a container sidecar) hits the same URL with the same header
 * (scripts/run-daily-jobs.sh, docs/SELF_HOSTING.md). Fails closed: no secret set
 * means it always rejects, never runs unauthenticated.
 *
 * Timezone note: the morning reminder, reach-out digest and confirmations digest
 * decide their calendar day from each recipient's own IANA zone
 * (schedule_prefs.timezone, default UTC — lib/time/zone.ts), and record the local
 * day they sent on (lib/jobs/last-run.ts) so a repeat invocation is a no-op. They
 * can additionally be held back to the recipient's local ~08:00, but only if this
 * endpoint is driven hourly with EMAIL_JOBS_HOURLY=true (MORNING_REMINDER_HOURLY
 * is the old name, honoured for one release; despite it, the gate now covers all
 * three jobs). The gate is opt-in precisely because it must never discard the only
 * invocation the day gets: on the single Hobby cron, unset, each job sends once at
 * whatever UTC hour the cron fires. The other jobs here have no hour gate.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messagingFlush = await runMessagingFlush();
  const signals = await runSignalDetection();
  const digest = await runDailyDigest();
  const confirmationsDigest = await runConfirmationsDigest();
  const reminder = await runMorningReminder();
  const followUpReminders = await runFollowUpReminders();
  const importantDateReminders = await runImportantDateReminders();
  const linkedinReminders = await runLinkedinExportReminders();
  return Response.json({
    messagingFlush,
    signals,
    digest,
    confirmationsDigest,
    reminder,
    followUpReminders,
    importantDateReminders,
    linkedinReminders,
  });
}
