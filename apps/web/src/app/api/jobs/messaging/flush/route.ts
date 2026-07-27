import { logActionError } from "@/lib/actions/resilience";
import { runMessagingFlush } from "@/lib/jobs/messaging-flush";

/**
 * Idle-session auto-flush worker. The daily cron (api/jobs/daily) already calls
 * runMessagingFlush once a day as the guaranteed floor everywhere; this
 * standalone route lets a Vercel-Pro cron OR a self-hoster's system cron drive
 * the flush every ~15 min WITHOUT adding a sub-daily entry to vercel.json (which
 * would break Vercel Hobby's once-a-day cron limit — see docs/SELF_HOSTING.md).
 *
 * Same auth contract as api/jobs/daily: a plain authenticated request carrying
 * `Authorization: Bearer $CRON_SECRET`. Fails closed — no secret set means it
 * always rejects, never runs unauthenticated. GET (what Vercel Cron sends) and
 * POST (what the documented system-cron curl uses) both work.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runMessagingFlush();
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    logActionError("messaging_flush_route", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
