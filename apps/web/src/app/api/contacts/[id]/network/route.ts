import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { getContact } from "@/lib/repo/contacts";
import { listContactConnectionsPage, type ConnectionSource } from "@/lib/repo/connections";
import {
  recommendContactsPage,
  type NetworkIntent,
} from "@/lib/repo/recommendations";

const SOURCES: ConnectionSource[] = ["relationship", "event", "company"];
const INTENTS: NetworkIntent[] = ["general", "founder", "sales", "investor"];

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
  if (!(await getContact(id))) {
    return Response.json({ error: "Contact not found." }, { status: 404 });
  }

  const searchParams = new URL(request.url).searchParams;
  const section = searchParams.get("section");
  const cursor = searchParams.get("cursor") ?? undefined;
  if (section === "connections") {
    const facets: Partial<Record<ConnectionSource, string[]>> = {};
    for (const entry of searchParams.getAll("facet")) {
      const separator = entry.indexOf(":");
      const source = entry.slice(0, separator) as ConnectionSource;
      const value = entry.slice(separator + 1);
      if (separator > 0 && SOURCES.includes(source) && value) {
        (facets[source] ??= []).push(value);
      }
    }
    return Response.json(
      await listContactConnectionsPage(id, {
        cursor,
        includeFacets: !cursor,
        filter: {
          facets,
          query: searchParams.get("q") ?? undefined,
        },
      }),
    );
  }
  if (section === "nearby") {
    const intentParam = searchParams.get("intent");
    const intent = INTENTS.includes(intentParam as NetworkIntent)
      ? (intentParam as NetworkIntent)
      : "general";
    return Response.json(
      await recommendContactsPage(id, {
        intent,
        context: searchParams.get("context") ?? undefined,
        cursor,
      }),
    );
  }

  return Response.json(
    { error: "section must be connections or nearby." },
    { status: 400 },
  );
}
