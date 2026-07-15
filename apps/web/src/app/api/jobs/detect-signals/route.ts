import { runSignalDetection } from "@/lib/jobs/detect-signals";
import { reapStuckExtractionJobs } from "@/lib/repo/extraction-jobs";
import type {
  DetectSignalsErrorResponse,
  SignalDetectionSummary,
} from "@dhaga/core/src/api/jobs";

/**
 * Cron entrypoint for nightly signal detection (BRD §6.7). Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set
 * (see apps/web/vercel.json); self-hosters point any scheduler at this URL
 * with the same header (docs/SELF_HOSTING.md). Fails closed: an unset
 * secret means the route always rejects, never runs unauthenticated.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "Unauthorized" } satisfies DetectSignalsErrorResponse,
      { status: 401 },
    );
  }
  // Backstop for extraction jobs a crashed worker or a function timeout left
  // mid-flight: mark them errored so the UI offers a retry instead of a pill
  // that spins forever. Runs on the default connection like the sweep below.
  await reapStuckExtractionJobs();
  const summary = await runSignalDetection();
  return Response.json(summary satisfies SignalDetectionSummary);
}
