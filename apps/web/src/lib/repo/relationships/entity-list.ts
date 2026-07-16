import { listNodeRelationships, type NodeRelationship } from "./node-list";

/** Entity pages render the shared node-relationship rows unchanged. */
export type EntityRelationship = NodeRelationship;

/**
 * An entity's explicit relationship edges, every endpoint kind included —
 * manual edges can tie an entity to contacts, companies and events too, and
 * the entity page is where those must stay visible and deletable. Query
 * strategy and labelling live in ./node-list.ts, shared with the
 * contact-centric lister in ./list.ts.
 */
export async function listEntityRelationships(
  entityId: string,
): Promise<EntityRelationship[]> {
  return listNodeRelationships("entity", entityId);
}
