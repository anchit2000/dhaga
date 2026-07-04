import { eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { listContactConnections } from "./connections";

/** Idea #1: recommended contacts on a contact page. */

export interface RecommendedContact {
  contactId: string;
  name: string;
  title: string | null;
  reasons: string[];
  score: number;
}

/**
 * Second-degree suggestions (v1.3): people connected to this contact's
 * connections, plus shared-tag matches. Pure graph traversal — no AI cost.
 */
export async function recommendContacts(
  contactId: string,
): Promise<RecommendedContact[]> {
  const direct = await listContactConnections(contactId);
  const exclude = new Set([contactId, ...direct.map((d) => d.contactId)]);
  const found = new Map<string, RecommendedContact>();
  const bump = (
    id: string,
    name: string,
    title: string | null,
    reason: string,
  ) => {
    const item =
      found.get(id) ?? { contactId: id, name, title, reasons: [], score: 0 };
    item.score += 1;
    if (!item.reasons.includes(reason) && item.reasons.length < 2) {
      item.reasons.push(reason);
    }
    found.set(id, item);
  };

  for (const connection of direct.slice(0, 10)) {
    const theirConnections = await listContactConnections(connection.contactId);
    for (const candidate of theirConnections) {
      if (exclude.has(candidate.contactId)) continue;
      bump(
        candidate.contactId,
        candidate.name,
        candidate.title,
        `via ${connection.name}`,
      );
    }
  }

  const db = await getDb();
  const [me] = await db
    .select({ tags: contacts.tags })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (me && me.tags.length > 0) {
    const myTags = new Set(me.tags);
    const others = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        title: contacts.title,
        tags: contacts.tags,
      })
      .from(contacts)
      .where(ne(contacts.id, contactId));
    for (const other of others) {
      if (exclude.has(other.id)) continue;
      const shared = other.tags.find((tag) => myTags.has(tag));
      if (shared) bump(other.id, other.name, other.title, `also ${shared}`);
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}
