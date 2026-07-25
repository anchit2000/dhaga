import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { listRecentExtractionJobs } from "@/lib/repo/extraction-jobs";
import type { ExtractionJobStatus } from "@/types";

/** Fallback status source for the person page's extraction stream. When a second
 *  tab's worker POST loses the atomic claim (the owning tab is draining the job),
 *  its stream emits `detached` and the client slow-polls THIS route to reconcile
 *  without a manual reload. The owning request writes stage/status to the DB
 *  (setExtractionJobStage / complete / fail / blocked), so these rows reflect live
 *  progress. RLS scopes rows to the signed-in user's own contacts; an id they
 *  don't own reads back empty. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }

  const { id } = await params;
  const jobs = (await listRecentExtractionJobs(id)).map((row) => ({
    id: row.id,
    stage: row.stage,
    status: row.status as ExtractionJobStatus,
  }));
  return Response.json(jobs);
}
