import { requireUserIdFromRequest } from "@/lib/auth/guard";
import {
  listRecentExtractionJobs,
  toExtractionJobView,
} from "@/lib/repo/extraction-jobs";
import type { ExtractionStatusResponse } from "@/types";

/** Poll target for the person page: active extraction jobs plus recently
 *  finished ones. RLS scopes rows to the signed-in user's own contacts. */
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
  const now = Date.now();
  const jobs = (await listRecentExtractionJobs(id)).map((row) =>
    toExtractionJobView(row, now),
  );
  return Response.json({ jobs } satisfies ExtractionStatusResponse);
}
