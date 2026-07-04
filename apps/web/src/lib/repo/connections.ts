import { aliasedTable, and, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, sessionContacts, sessions } from "@/lib/db/schema";

export interface ConnectionItem {
  contactId: string;
  name: string;
  title: string | null;
  /** Why they're connected, e.g. "Same company", "Web Summit 2026", "knows". */
  via: string[];
}

/** M5 acceptance: same-company, same-session, and explicit-edge connections. */
export async function listContactConnections(
  contactId: string,
): Promise<ConnectionItem[]> {
  const db = await getDb();
  const found = new Map<string, ConnectionItem>();
  const add = (id: string, name: string, title: string | null, via: string) => {
    const item = found.get(id) ?? { contactId: id, name, title, via: [] };
    if (!item.via.includes(via) && item.via.length < 3) item.via.push(via);
    found.set(id, item);
  };

  const self = aliasedTable(contacts, "self");
  const sameCompany = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .innerJoin(self, eq(self.companyId, contacts.companyId))
    .where(and(eq(self.id, contactId), ne(contacts.id, contactId)));
  for (const row of sameCompany) add(row.id, row.name, row.title, "Same company");

  const mine = aliasedTable(sessionContacts, "mine");
  const sameSession = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      title: contacts.title,
      sessionName: sessions.name,
    })
    .from(mine)
    .innerJoin(sessionContacts, eq(sessionContacts.sessionId, mine.sessionId))
    .innerJoin(contacts, eq(contacts.id, sessionContacts.contactId))
    .innerJoin(sessions, eq(sessions.id, mine.sessionId))
    .where(and(eq(mine.contactId, contactId), ne(contacts.id, contactId)));
  for (const row of sameSession) add(row.id, row.name, row.title, row.sessionName);

  const personEdges = await db
    .select({ edge: edges })
    .from(edges)
    .where(
      and(
        isNull(edges.deletedAt),
        or(
          and(eq(edges.srcType, "contact"), eq(edges.srcId, contactId)),
          and(eq(edges.dstType, "person"), eq(edges.dstId, contactId)),
        ),
      ),
    );
  const otherIds = personEdges
    .map(({ edge }) =>
      edge.srcId === contactId
        ? edge.dstType === "person"
          ? edge.dstId
          : null
        : edge.srcId,
    )
    .filter((id): id is string => Boolean(id) && id !== contactId);
  if (otherIds.length > 0) {
    for (const { edge } of personEdges) {
      const otherId = edge.srcId === contactId ? edge.dstId : edge.srcId;
      const [other] = await db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title })
        .from(contacts)
        .where(eq(contacts.id, otherId))
        .limit(1);
      if (other) {
        add(other.id, other.name, other.title, edge.predicate.replaceAll("_", " "));
      }
    }
  }

  return [...found.values()].sort((a, b) => b.via.length - a.via.length);
}
