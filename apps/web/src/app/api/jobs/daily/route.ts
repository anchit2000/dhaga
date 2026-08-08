import { errorFields } from "@dhaga/core/src/logging";
import { runPersonClassification } from "@/lib/jobs/classify-people";
import { runConfirmationsDigest } from "@/lib/jobs/confirmations-digest";
import { runDailyDigest } from "@/lib/jobs/daily-digest";
import { runGoalMatching } from "@/lib/jobs/match-goal";
import { runFollowUpReminders } from "@/lib/jobs/follow-up-reminders";
import { runImportantDateReminders } from "@/lib/jobs/important-date-reminders";
import { runLinkedinExportReminders } from "@/lib/jobs/linkedin-export-reminders";
import { runMessagingFlush } from "@/lib/jobs/messaging-flush";
import { runMorningReminder } from "@/lib/jobs/morning-reminder";
import { runSignalDetection } from "@/lib/jobs/detect-signals";

/**
 * One failed job, named. `job` is the response key so an operator can line the
 * failure up with the null slot; the rest is PII-safe error shape from
 * @dhaga/core/src/logging (never the error body — these jobs handle contact
 * data). Declared here rather than in @/types because nothing outside this
 * route's own response consumes it.
 */
type JobFailure = { job: string } & ReturnType<typeof errorFields>;

/**
 * Run one nightly job with its own error boundary: a throw is recorded against
 * the job's name and the sweep continues with the next one. Returns null for a
 * failed job so the response keeps its shape (every key present) while still
 * distinguishing "this job produced no work" (a summary of zeros) from "this job
 * did not run" (null + an entry in `failures`).
 */
async function runJob<T>(
  job: string,
  run: () => Promise<T>,
  failures: JobFailure[],
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    const failure: JobFailure = { job, ...errorFields(error) };
    console.error("[job:daily] job failed", failure);
    failures.push(failure);
    return null;
  }
}

/**
 * The single daily-jobs entrypoint. Vercel Hobby allows only one cron, so all
 * once-a-day work runs here: the messaging idle-flush (the guaranteed daily
 * floor for auto-saving quiet capture batches — a Vercel-Pro/system cron can
 * additionally drive api/jobs/messaging/flush every ~15 min), signal detection,
 * the two nightly curation passes (person-vs-service classification and goal
 * matching — both Batch API, both zero-credit, both reported with a `remaining`
 * count so an operator can watch a backfill drain), the reach-out digest, the
 * confirmations digest, the morning follow-up reminder, the due-follow-up
 * reminder sweep, the birthday/anniversary reminder sweep, and the LinkedIn
 * export reminders.
 * Order is load-bearing in one place: both curation passes run before the
 * reach-out digest, which emails today's suggestions and so must see the
 * freshest labels and cohort.
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
 *
 * Isolation: every job runs through `runJob`, so one throwing can no longer skip
 * the nine after it. These are sequential awaits sharing the day's only cron
 * slot, so an unhandled throw in an early job used to cost every later job its
 * run AND return a bare 500 that named none of them. Failures now come back in
 * `failures` (empty array on a clean run) keyed by job name, with that job's slot
 * set to null instead of a summary. Still 200 unless auth fails: a partial night
 * is not a reason for a scheduler to retry the endpoint and re-send every email
 * the jobs that DID succeed already sent.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const failures: JobFailure[] = [];
  const messagingFlush = await runJob("messagingFlush", runMessagingFlush, failures);
  const signals = await runJob("signals", runSignalDetection, failures);
  // Both curation passes run BEFORE the digest: it emails today's suggestions,
  // so it has to read the freshest person/service labels and goal cohort. They
  // also have to run before each other's summaries are read — sequential awaits,
  // matching the rest of this file, because each pass is itself a per-tenant
  // sweep holding a connection from a small pool.
  const personClassification = await runJob(
    "personClassification",
    runPersonClassification,
    failures,
  );
  const goalMatching = await runJob("goalMatching", runGoalMatching, failures);
  const digest = await runJob("digest", runDailyDigest, failures);
  const confirmationsDigest = await runJob("confirmationsDigest", runConfirmationsDigest, failures);
  const reminder = await runJob("reminder", runMorningReminder, failures);
  const followUpReminders = await runJob("followUpReminders", runFollowUpReminders, failures);
  const importantDateReminders = await runJob(
    "importantDateReminders",
    runImportantDateReminders,
    failures,
  );
  const linkedinReminders = await runJob("linkedinReminders", runLinkedinExportReminders, failures);
  return Response.json({
    messagingFlush,
    signals,
    personClassification,
    goalMatching,
    digest,
    confirmationsDigest,
    reminder,
    followUpReminders,
    importantDateReminders,
    linkedinReminders,
    failures,
  });
}
