import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getCardImage } from "@/lib/repo/card-images";

/** Serves a stored card photo (the visual receipt). Session-gated and
 *  private-cached — photos never leave the user's own database otherwise. */
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
  const image = await getCardImage(id);
  if (!image) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  return new Response(Buffer.from(image.dataBase64, "base64"), {
    headers: {
      "Content-Type": image.mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
