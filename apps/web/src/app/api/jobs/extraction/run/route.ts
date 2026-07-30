import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { processExtractionJob } from "@/lib/jobs/extraction/process";
import type { ExtractionStreamEvent } from "@/types";

/** Worker for background note-extraction and enrichment jobs. The page fires
 *  this after enqueuing and reads the streamed NDJSON progress; the function
 *  runs to completion even if the browser navigates away (keepalive fetch). 60s
 *  covers a Sonnet web search + Haiku extraction on Vercel Hobby; anything
 *  slower is caught by the daily reaper. */
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

  // NDJSON: one ExtractionStreamEvent JSON object per line. RLS scopes the job
  // to this user; an id they don't own simply no-ops (the claim returns null,
  // so the stream closes with no events).
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const onEvent = (event: ExtractionStreamEvent): void => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // Nobody is reading any more (the tab closed, the connection dropped).
          // Progress has nowhere to go, but the job must still run to completion:
          // an enqueue throw here would land in processExtractionJob's catch and
          // mark a job that actually succeeded as failed.
        }
      };
      try {
        await processExtractionJob(jobId, userId, onEvent);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-store",
    },
  });
}
