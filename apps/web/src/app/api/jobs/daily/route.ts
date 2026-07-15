import { runDailyDigest } from "@/lib/jobs/daily-digest";
import { runSignalDetection } from "@/lib/jobs/detect-signals";

/**
 * The single daily-jobs entrypoint. Vercel Hobby allows only one cron, so all
 * once-a-day work runs here: signal detection plus the reach-out digest. It's a
 * plain authenticated GET — Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * (apps/web/vercel.json), and off Vercel ANY scheduler (system crontab, GitHub
 * Actions, a container sidecar) hits the same URL with the same header
 * (scripts/run-daily-jobs.sh, docs/SELF_HOSTING.md). Fails closed: no secret set
 * means it always rejects, never runs unauthenticated.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const signals = await runSignalDetection();
  const digest = await runDailyDigest();
  return Response.json({ signals, digest });
}
