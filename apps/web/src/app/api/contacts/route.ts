import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";
import type {
  ContactsErrorResponse,
  ContactsSearchResponse,
} from "@dhaga/core/src/api/contacts";

/** Contact lookup for external surfaces (extension attach-to-contact). */
export async function GET(request: Request): Promise<Response> {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return Response.json(
      { error: "Not signed in to Dhaga." } satisfies ContactsErrorResponse,
      { status: 401 },
    );
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const contacts = await listContacts(q);
  return Response.json({
    contacts: contacts.slice(0, 8).map((contact) => ({
      id: contact.id,
      name: contact.name,
      title: contact.title,
      companyName: contact.companyName,
    })),
  } satisfies ContactsSearchResponse);
}
