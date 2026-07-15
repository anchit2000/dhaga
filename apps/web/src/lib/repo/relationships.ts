import { and, asc, eq, isNull } from "drizzle-orm";
import { relationshipRole } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges } from "@/lib/db/schema";

export interface ContactRelationship {
  /** The other person in the relationship. */
  contactId: string;
  name: string;
  title: string | null;
  mentioned: boolean;
  predicate: string;
  /** How the other person relates to the viewed contact, direction-corrected. */
  role: string;
}

interface EdgeSide {
  id: string;
  name: string;
  title: string | null;
  source: string;
  predicate: string;
}

/**
 * A contact's explicit person-to-person relationship edges, both directions,
 * each labelled from the viewed contact's perspective: an edge stored once as
 * `Ajay --parent_of--> Anchit` reads as "child" on Ajay's page and "parent" on
 * Anchit's, without persisting an inverse row. Company edges are excluded —
 * this is the interpersonal graph the contact page surfaces by default.
 */
export async function listContactRelationships(
  contactId: string,
): Promise<ContactRelationship[]> {
  const db = await getDb();
  const select = {
    id: contacts.id,
    name: contacts.name,
    title: contacts.title,
    source: contacts.source,
    predicate: edges.predicate,
  };

  // Out-edges: the viewed contact is the source, the other person is the dst.
  const outRows = await db
    .select(select)
    .from(edges)
    .innerJoin(contacts, eq(contacts.id, edges.dstId))
    .where(and(eq(edges.srcId, contactId), eq(edges.dstType, "person"), isNull(edges.deletedAt)))
    .orderBy(asc(contacts.name));

  // In-edges: the viewed contact is the destination, the other person is the src.
  const inRows = await db
    .select(select)
    .from(edges)
    .innerJoin(contacts, eq(contacts.id, edges.srcId))
    .where(and(eq(edges.dstId, contactId), eq(edges.srcType, "contact"), isNull(edges.deletedAt)))
    .orderBy(asc(contacts.name));

  const items: ContactRelationship[] = [];
  const seen = new Set<string>();
  const push = (row: EdgeSide, viewerIsSource: boolean): void => {
    if (row.id === contactId) return; // ignore any self-loop
    const key = `${row.id}:${row.predicate}:${viewerIsSource ? "s" : "d"}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      contactId: row.id,
      name: row.name,
      title: row.title,
      mentioned: row.source === "mentioned",
      predicate: row.predicate,
      role: relationshipRole(row.predicate, viewerIsSource),
    });
  };
  for (const row of outRows) push(row, true);
  for (const row of inRows) push(row, false);
  items.sort((a, b) => a.name.localeCompare(b.name) || a.contactId.localeCompare(b.contactId));
  return items;
}
