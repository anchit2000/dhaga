import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
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
 * the `works_at` edge to the contact's CURRENT employer (contacts.company_id),
 * which duplicates the employment header. A manual works_at to any OTHER
 * company has no header mirroring it — hiding those made the dialog's own
 * output invisible and undeletable (found live) — so everything else a user
 * or extraction ties to the contact stays visible and deletable here.
 */
export async function listContactRelationships(
  contactId: string,
): Promise<ContactRelationship[]> {
  const db = await getDb();
  const [rows, [self]] = await Promise.all([
    listNodeRelationships("contact", contactId),
    db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, contactId)),
  ]);
  const employerId = self?.companyId ?? null;
  return rows
    .filter(
      (row) =>
        !(row.kind === "company" && row.predicate === "works_at" && row.otherId === employerId),
    )
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
