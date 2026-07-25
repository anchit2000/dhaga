import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { listFacts } from "@/lib/repo/notes";

/** This contact's facts, refetched by the person page once the extraction
 *  stream reports new facts landed — a single scoped query in place of the old
 *  whole-page router.refresh(). RLS scopes rows to the signed-in user's own
 *  contacts, so an id they don't own reads back empty. */
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
  const facts = await listFacts(id);
  return Response.json({ facts });
}
