import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getSession, renameSession } from "@/lib/repo/sessions";
import type {
  SessionErrorResponse,
  SessionRenameRequest,
  SessionRenameResponse,
} from "@dhaga/core/src/api/sessions";

/**
 * Renames a session — the mobile-callable counterpart to the web's
 * renameSessionAction, needed for M2 auto event grouping's one-time
 * "Name this event?" prompt (BRD §6.2).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json(
      { error: "Not signed in to Dhaga." } satisfies SessionErrorResponse,
      { status: 401 },
    );
  }

  const { id } = await params;
  const existing = await getSession(id);
  if (!existing) {
    return Response.json({ error: "Session not found." } satisfies SessionErrorResponse, {
      status: 404,
    });
  }

  let name = "";
  try {
    const body = (await request.json()) as SessionRenameRequest;
    name = String(body.name ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request." } satisfies SessionErrorResponse, {
      status: 400,
    });
  }
  if (!name) {
    return Response.json({ error: "Give the session a name." } satisfies SessionErrorResponse, {
      status: 400,
    });
  }

  await renameSession(id, name);
  return Response.json({ id, name } satisfies SessionRenameResponse);
}
