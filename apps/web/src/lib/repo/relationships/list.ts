import { listNodeRelationships } from "./node-list";
import type { RelationshipEndpointKind } from "./mutations";

export interface ContactRelationship {
  /** The edges row backing this relationship (delete affordance target). */
  edgeId: string;
  /** The other endpoint in the relationship. */
  contactId: string;
  kind: RelationshipEndpointKind;
  name: string;
  title: string | null;
  mentioned: boolean;
  predicate: string;
  /** How the other endpoint relates to the viewed contact, direction-corrected. */
  role: string;
}

/**
 * A contact's explicit relationship edges to every endpoint kind (see
 * ./node-list.ts for the direction-corrected labelling). The one exclusion:
 * company edges with predicate `works_at`, which duplicate the employment
 * header already sourced from company_id/positions — anything else a user or
 * extraction ties to the contact (consults_for → Acme, attended → a summit)
 * must stay visible and deletable here.
 */
export async function listContactRelationships(
  contactId: string,
): Promise<ContactRelationship[]> {
  const rows = await listNodeRelationships("contact", contactId);
  return rows
    .filter((row) => !(row.kind === "company" && row.predicate === "works_at"))
    .map((row) => ({
      edgeId: row.edgeId,
      contactId: row.otherId,
      kind: row.kind,
      name: row.name,
      title: row.kind === "contact" ? row.sublabel : null,
      mentioned: row.mentioned,
      predicate: row.predicate,
      role: row.role,
    }));
}
