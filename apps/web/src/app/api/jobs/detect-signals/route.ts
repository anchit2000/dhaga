import { runSignalDetection } from "@/lib/jobs/detect-signals";
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
  const summary = await runSignalDetection();
  return Response.json(summary satisfies SignalDetectionSummary);
}
