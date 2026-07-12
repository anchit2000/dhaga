import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, edges, eventContacts } from "@/lib/db/schema";
import type { Candidate, PathNode, WarmPath } from "./types";

export async function loadNode(id: string): Promise<PathNode | null> {
  const db = await getDb();
  const [contact] = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  if (contact) return { id: contact.id, label: contact.name, kind: "contact" };

  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return company ? { id: company.id, label: company.name, kind: "company" } : null;
}

/**
 * One BFS hop: given the current frontier (contact ids only ever populated
 * on hop 0; company ids on every hop after), find every directly reachable
 * neighbor via edges, company membership, and event co-attendance —
 * scoped to just that frontier, never the whole graph.
 */
export async function expandHop(
  contactFrontier: string[],
  companyFrontier: string[],
): Promise<Map<string, Candidate[]>> {
  const db = await getDb();
  const frontierSet = new Set([...contactFrontier, ...companyFrontier]);

  const [edgeRows, ownCompanyRows, memberRows, attendanceRows] = await Promise.all([
    frontierSet.size
      ? db
          .select({ srcId: edges.srcId, dstId: edges.dstId, dstType: edges.dstType })
          .from(edges)
          .where(
            and(
              isNull(edges.deletedAt),
              or(inArray(edges.srcId, [...frontierSet]), inArray(edges.dstId, [...frontierSet])),
            ),
          )
      : [],
    contactFrontier.length
      ? db
          .select({ id: contacts.id, companyId: contacts.companyId })
          .from(contacts)
          .where(and(inArray(contacts.id, contactFrontier), isNotNull(contacts.companyId)))
      : [],
    companyFrontier.length
      ? db
          .select({ id: contacts.id, companyId: contacts.companyId })
          .from(contacts)
          .where(inArray(contacts.companyId, companyFrontier))
      : [],
    contactFrontier.length
      ? db
          .select({ eventId: eventContacts.eventId, contactId: eventContacts.contactId })
          .from(eventContacts)
          .where(inArray(eventContacts.contactId, contactFrontier))
      : [],
  ]);

  // src_id is always a contact; dst_id is a contact ("person") or a company
  // (see repo/graph.ts's applyExtraction — never the reverse). Raw discovery
  // pairs, resolved to real rows + labels below.
  const raw: { from: string; to: string; kind: "contact" | "company" }[] = [];
  for (const edge of edgeRows) {
    const dstKind: "contact" | "company" = edge.dstType === "company" ? "company" : "contact";
    if (frontierSet.has(edge.srcId)) raw.push({ from: edge.srcId, to: edge.dstId, kind: dstKind });
    if (frontierSet.has(edge.dstId)) raw.push({ from: edge.dstId, to: edge.srcId, kind: "contact" });
  }
  for (const row of ownCompanyRows) {
    if (row.companyId) raw.push({ from: row.id, to: row.companyId, kind: "company" });
  }
  for (const row of memberRows) {
    if (row.companyId) raw.push({ from: row.companyId, to: row.id, kind: "contact" });
  }

  // Event co-attendance, scoped to only the events this hop's contacts
  // actually attended — never all events ever.
  const touchedEventIds = [...new Set(attendanceRows.map((row) => row.eventId))];
  if (touchedEventIds.length) {
    const allAttendance = await db
      .select({ eventId: eventContacts.eventId, contactId: eventContacts.contactId })
      .from(eventContacts)
      .where(inArray(eventContacts.eventId, touchedEventIds));
    const byEvent = new Map<string, string[]>();
    for (const row of allAttendance) {
      (byEvent.get(row.eventId) ?? byEvent.set(row.eventId, []).get(row.eventId)!).push(
        row.contactId,
      );
    }
    for (const row of attendanceRows) {
      for (const other of byEvent.get(row.eventId) ?? []) {
        if (other !== row.contactId) raw.push({ from: row.contactId, to: other, kind: "contact" });
      }
    }
  }

  const contactIds = [...new Set(raw.filter((r) => r.kind === "contact").map((r) => r.to))];
  const companyIds = [...new Set(raw.filter((r) => r.kind === "company").map((r) => r.to))];
  const [contactNames, companyNames] = await Promise.all([
    contactIds.length
      ? db.select({ id: contacts.id, name: contacts.name }).from(contacts).where(inArray(contacts.id, contactIds))
      : [],
    companyIds.length
      ? db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, companyIds))
      : [],
  ]);
  const labels = new Map<string, string>();
  for (const row of contactNames) labels.set(row.id, row.name);
  for (const row of companyNames) labels.set(row.id, row.name);

  const byFrom = new Map<string, Candidate[]>();
  for (const r of raw) {
    if (r.to === r.from) continue; // self-loop, malformed or otherwise
    const label = labels.get(r.to);
    if (!label) continue; // dangling reference (row no longer exists) — drop
    (byFrom.get(r.from) ?? byFrom.set(r.from, []).get(r.from)!).push({ to: r.to, kind: r.kind, label });
  }
  return byFrom;
}

export function reconstruct(
  entryId: string,
  previous: Map<string, string | null>,
  nodes: Map<string, PathNode>,
): WarmPath {
  const chain: PathNode[] = [];
  for (let at: string | null = entryId; at != null; at = previous.get(at) ?? null) {
    chain.push(nodes.get(at)!);
  }
  return { nodes: chain };
}
