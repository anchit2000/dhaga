import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { processExtractionJob } from "@/lib/jobs/extraction/process";

/** Worker for background note-extraction and enrichment jobs. The page fires
 *  this fire-and-forget after enqueuing; the function runs to completion even
 *  if the browser navigates away. 60s covers a Sonnet web search + Haiku
 *  extraction on Vercel Hobby; anything slower is caught by the daily reaper. */
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId") ?? "";
  if (!jobId) {
    return Response.json({ error: "Missing jobId." }, { status: 400 });
  }

  // RLS scopes the job to this user; an id they don't own simply no-ops.
  await processExtractionJob(jobId, userId);
  return Response.json({ ok: true });
}
