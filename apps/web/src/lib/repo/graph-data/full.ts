import { eq, isNotNull, isNull, sql } from "drizzle-orm";
import { affiliationPredicate } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import {
  companies,
  contacts,
  edges,
  entities,
  eventContacts,
  events,
  nodeTypes,
  positions,
  relationshipTypes,
} from "@/lib/db/schema";
import { getLayout } from "../graph-layouts";
import type { FullGraphEdge, FullGraphNode, FullGraphPayload } from "./types";

/**
 * The one payload for the whole graph (full-load architecture — no
 * pagination by design; the client lays out and filters locally). A handful
 * of set-based queries, never per-node work. Degree is NOT computed here —
 * the client derives it from the edge list. Tag hubs and tagged edges are
 * deliberately absent: contacts × tags is unbounded, so the tag layer ships
 * separately via fetchTagLayer (GET /api/graph/tags) when first enabled.
 */
export async function fetchFullGraph(): Promise<FullGraphPayload> {
  const db = await getDb();
  const [contactRows, companyRows, eventRows, entityRows, typeRows, relTypeRows, edgeRows, attendance, positionRows, layout] =
    await Promise.all([
      db
        .select({ id: contacts.id, name: contacts.name, title: contacts.title, companyId: contacts.companyId })
        .from(contacts),
      db.select({ id: companies.id, name: companies.name, sector: companies.sector }).from(companies),
      db.select({ id: events.id, name: events.name }).from(events),
      db
        .select({ id: entities.id, name: entities.name, typeId: entities.typeId, typeName: nodeTypes.name })
        .from(entities)
        .innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId)),
      db.select({ id: nodeTypes.id, name: nodeTypes.name, slug: nodeTypes.slug, color: nodeTypes.color }).from(nodeTypes),
      db
        .select({ id: relationshipTypes.id, slug: relationshipTypes.slug, forwardLabel: relationshipTypes.forwardLabel, inverseLabel: relationshipTypes.inverseLabel })
        .from(relationshipTypes),
      db
        .select({ id: edges.id, srcId: edges.srcId, dstId: edges.dstId, predicate: edges.predicate })
        .from(edges)
        .where(isNull(edges.deletedAt)),
      db.select({ eventId: eventContacts.eventId, contactId: eventContacts.contactId }).from(eventContacts),
      db
        .select({ id: positions.id, contactId: positions.contactId, companyId: positions.companyId, isCurrent: positions.isCurrent, relation: positions.relation, sortOrder: positions.sortOrder })
        .from(positions)
        .where(isNotNull(positions.companyId)),
      getLayout(),
    ]);

  const nodes: FullGraphNode[] = [
    ...contactRows.map(
      (row): FullGraphNode => ({ id: row.id, kind: "contact", label: row.name, sublabel: row.title }),
    ),
    ...companyRows.map(
      (row): FullGraphNode => ({ id: row.id, kind: "company", label: row.name, sublabel: row.sector }),
    ),
    ...eventRows.map(
      (row): FullGraphNode => ({ id: row.id, kind: "event", label: row.name, sublabel: null }),
    ),
    ...entityRows.map(
      (row): FullGraphNode => ({ id: row.id, kind: "entity", typeId: row.typeId, label: row.name, sublabel: row.typeName }),
    ),
  ];

  // Explicit edges, endpoint-checked so the client never receives a dangling
  // reference (an edge whose node was deleted would crash the renderer).
  const graphEdges: FullGraphEdge[] = [];
  const knownIds = new Set(nodes.map((node) => node.id));
  for (const edge of edgeRows) {
    if (!knownIds.has(edge.srcId) || !knownIds.has(edge.dstId)) continue;
    graphEdges.push({
      id: edge.id,
      source: edge.srcId,
      target: edge.dstId,
      predicate: edge.predicate,
      kind: "explicit",
    });
  }
  // Affiliation edges derive from positions (source of truth for employment &
  // education), so past/additional roles surface — not just the denormalised
  // company_id. Each contact keeps exactly ONE kind:"works_at" edge (its PRIMARY
  // role) so FA2 seeding/clustering and the client's pinned `works-at:<contactId>`
  // sigma key stay unchanged; every other role ships as a labeled kind:"affiliation"
  // edge, labeled by affiliationPredicate() ("studied at"/"worked at", not "works at").
  const rolesByContact = new Map<string, typeof positionRows>();
  for (const pos of positionRows) {
    if (!pos.companyId) continue; // the query filters these out; this narrows the type
    (rolesByContact.get(pos.contactId) ?? rolesByContact.set(pos.contactId, []).get(pos.contactId)!).push(pos);
  }
  for (const contact of contactRows) {
    const roles = rolesByContact.get(contact.id);
    if (!roles) continue;
    // Primary = role at the denormalised company_id, else current, else first.
    const ordered = [...roles].sort((a, b) => a.sortOrder - b.sortOrder);
    const primary =
      (contact.companyId ? ordered.find((role) => role.companyId === contact.companyId) : undefined) ??
      ordered.find((role) => role.isCurrent) ??
      ordered[0];
    for (const role of ordered) {
      if (!role.companyId) continue;
      const isPrimary = role.id === primary.id;
      graphEdges.push({
        id: isPrimary ? `works-at:${contact.id}` : `affil:${role.id}`,
        source: contact.id,
        target: role.companyId,
        predicate: affiliationPredicate(role),
        kind: isPrimary ? "works_at" : "affiliation",
      });
    }
  }
  for (const row of attendance) {
    graphEdges.push({
      id: `attended:${row.eventId}:${row.contactId}`,
      source: row.contactId,
      target: row.eventId,
      predicate: "attended",
      kind: "attended",
    });
  }

  return { nodes, edges: graphEdges, nodeTypes: typeRows, relationshipTypes: relTypeRows, layout };
}

/**
 * Cheap per-user graph version for ETag revalidation: one round-trip of
 * scalar aggregates (RLS scopes every subquery to the tenant), no payload
 * assembly. Counts + max timestamps cover inserts/updates/tombstones; tables
 * whose payload-visible columns can mutate WITHOUT a timestamp (companies'
 * name/sector, events' name, node_types' name/slug/color) fold an id-ordered
 * md5 over those columns instead, so e.g. a company rename can never be
 * masked behind a 304. graph_layouts is deliberately excluded: any settled
 * layout for the same graph hash is valid, and including it would churn the
 * ETag on our own layout uploads.
 */
export async function fetchGraphVersion(): Promise<string> {
  const db = await getDb();
  const result = (await db.execute(sql`
    SELECT md5(concat_ws('|',
      (SELECT concat(count(*), ':', max(updated_at)) FROM contacts),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(concat(name, ':', sector), ',' ORDER BY id), ''))) FROM companies),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(name, ',' ORDER BY id), ''))) FROM events),
      (SELECT concat(count(*), ':', max(updated_at)) FROM entities),
      (SELECT concat(count(*), ':', max(created_at), ':', max(deleted_at)) FROM edges),
      (SELECT concat(count(*), ':', max(scanned_at)) FROM event_contacts),
      (SELECT concat(count(*), ':', md5(coalesce(string_agg(concat(name, ':', slug, ':', color), ',' ORDER BY id), ''))) FROM node_types),
      (SELECT concat(count(*), ':', max(created_at)) FROM relationship_types)
    )) AS version
  `)) as unknown as { rows: { version: string }[] };
  return result.rows[0].version;
}
