import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { relationshipRole } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, edges, entities, events, nodeTypes } from "@/lib/db/schema";
import { relationshipLabelMap } from "../relationship-types";
import type { RelationshipEndpointKind } from "./mutations";

export interface NodeRelationship {
  /** The edges row backing this relationship (delete affordance target). */
  edgeId: string;
  /** The other endpoint. */
  otherId: string;
  kind: RelationshipEndpointKind;
  name: string;
  /** Contact title / entity type name; null for companies and events. */
  sublabel: string | null;
  /** Contact endpoints only: the row is a hidden "mentioned" person. */
  mentioned: boolean;
  predicate: string;
  /** How the other endpoint relates to the viewed node, direction-corrected. */
  role: string;
}

/**
 * A node's explicit relationship edges, both directions, each labelled from
 * the viewed node's perspective: an edge stored once as
 * `Ajay --parent_of--> Anchit` reads as "child" on Ajay's page and "parent"
 * on Anchit's, without persisting an inverse row (user-defined predicates
 * label the same way via the custom map). One query strategy for every root
 * kind: a single or() scan over edges, then one batched name lookup per
 * endpoint kind — never per-edge work.
 */
export async function listNodeRelationships(
  rootKind: RelationshipEndpointKind,
  rootId: string,
): Promise<NodeRelationship[]> {
  const db = await getDb();
  const customLabels = await relationshipLabelMap();
  const rows = await db
    .select({
      id: edges.id,
      srcType: edges.srcType,
      srcId: edges.srcId,
      dstType: edges.dstType,
      dstId: edges.dstId,
      predicate: edges.predicate,
    })
    .from(edges)
    .where(
      and(
        isNull(edges.deletedAt),
        or(
          and(eq(edges.srcType, rootKind), eq(edges.srcId, rootId)),
          and(eq(edges.dstType, rootKind), eq(edges.dstId, rootId)),
        ),
      ),
    );

  // One name lookup per endpoint kind, not per edge.
  const idsByKind: Record<RelationshipEndpointKind, Set<string>> = {
    contact: new Set(),
    company: new Set(),
    event: new Set(),
    entity: new Set(),
  };
  const sides = rows.flatMap((row) => {
    const viewerIsSource = row.srcType === rootKind && row.srcId === rootId;
    const kind = (viewerIsSource ? row.dstType : row.srcType) as RelationshipEndpointKind;
    const otherId = viewerIsSource ? row.dstId : row.srcId;
    if (!(kind in idsByKind) || otherId === rootId) return []; // junk type / self-loop
    idsByKind[kind].add(otherId);
    return [{ edgeId: row.id, otherId, kind, predicate: row.predicate, viewerIsSource }];
  });

  const [contactRows, companyRows, eventRows, entityRows] = await Promise.all([
    idsByKind.contact.size
      ? db.select({ id: contacts.id, name: contacts.name, title: contacts.title, source: contacts.source }).from(contacts).where(inArray(contacts.id, [...idsByKind.contact]))
      : [],
    idsByKind.company.size
      ? db.select({ id: companies.id, name: companies.name }).from(companies).where(inArray(companies.id, [...idsByKind.company]))
      : [],
    idsByKind.event.size
      ? db.select({ id: events.id, name: events.name }).from(events).where(inArray(events.id, [...idsByKind.event]))
      : [],
    idsByKind.entity.size
      ? db.select({ id: entities.id, name: entities.name, typeName: nodeTypes.name }).from(entities).innerJoin(nodeTypes, eq(nodeTypes.id, entities.typeId)).where(inArray(entities.id, [...idsByKind.entity]))
      : [],
  ]);
  const labels = new Map<string, { name: string; sublabel: string | null; mentioned: boolean }>();
  for (const row of contactRows) labels.set(`contact:${row.id}`, { name: row.name, sublabel: row.title, mentioned: row.source === "mentioned" });
  for (const row of companyRows) labels.set(`company:${row.id}`, { name: row.name, sublabel: null, mentioned: false });
  for (const row of eventRows) labels.set(`event:${row.id}`, { name: row.name, sublabel: null, mentioned: false });
  for (const row of entityRows) labels.set(`entity:${row.id}`, { name: row.name, sublabel: row.typeName, mentioned: false });

  const items = sides.flatMap((side) => {
    const label = labels.get(`${side.kind}:${side.otherId}`);
    if (!label) return []; // endpoint row vanished mid-flight — skip, don't crash
    return [{
      edgeId: side.edgeId,
      otherId: side.otherId,
      kind: side.kind,
      name: label.name,
      sublabel: label.sublabel,
      mentioned: label.mentioned,
      predicate: side.predicate,
      role: relationshipRole(side.predicate, side.viewerIsSource, customLabels),
    }];
  });
  items.sort((a, b) => a.name.localeCompare(b.name) || a.edgeId.localeCompare(b.edgeId));
  return items;
}
