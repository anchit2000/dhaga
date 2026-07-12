import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getEvent, renameEvent } from "@/lib/repo/events";
import type {
  EventErrorResponse,
  EventRenameRequest,
  EventRenameResponse,
} from "@dhaga/core/src/api/events";

/**
 * Renames a event — the mobile-callable counterpart to the web's
 * renameEventAction, needed for M2 auto event grouping's one-time
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
      { error: "Not signed in to Dhaga." } satisfies EventErrorResponse,
      { status: 401 },
    );
  }

  const { id } = await params;
  const existing = await getEvent(id);
  if (!existing) {
    return Response.json({ error: "Event not found." } satisfies EventErrorResponse, {
      status: 404,
    });
  }

  let name = "";
  try {
    const body = (await request.json()) as EventRenameRequest;
    name = String(body.name ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request." } satisfies EventErrorResponse, {
      status: 400,
    });
  }
  if (!name) {
    return Response.json({ error: "Give the event a name." } satisfies EventErrorResponse, {
      status: 400,
    });
  }

  await renameEvent(id, name);
  return Response.json({ id, name } satisfies EventRenameResponse);
}
