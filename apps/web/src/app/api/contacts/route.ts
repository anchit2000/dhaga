import { hasSession } from "@/lib/auth/guard";
import { listContacts } from "@/lib/repo/contacts";

/** Contact lookup for external surfaces (extension attach-to-contact). */
export async function GET(request: Request): Promise<Response> {
  if (!(await hasSession())) {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
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
  });
}
