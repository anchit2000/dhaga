import { eq } from "drizzle-orm";
import type { ConfirmationOption, Relationship } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { SUBJECT_PRONOUNS } from "@/utils/constants/relationships";
import { findOrCreateCompany } from "../../contacts";
import {
  findEntityCandidates,
  findRelationshipCandidates,
  resolveEntityObject,
  resolvePersonObject,
  type RelationshipCandidate,
} from "../../edge-suggestions";

/** The relationship's subject: a single confident contact, or an ambiguous one
 *  the user must disambiguate (a pronoun, or a name matching ≠1 contact). */
export type SubjectResolution =
  | { kind: "confident"; contactId: string }
  | { kind: "ambiguous"; candidates: RelationshipCandidate[] };

/** The relationship's object: a concrete destination to link now, or an
 *  ambiguous one carrying render-ready candidate options for a confirmation. */
export type ObjectResolution =
  | { kind: "concrete"; dstType: "company" | "contact" | "entity"; dstId: string }
  | {
      kind: "ambiguous";
      objectType: "person" | "entity";
      entityTypeHint: string | null;
      options: ConfirmationOption[];
    };

/**
 * Resolve the relationship SUBJECT. The extractor emits the literal "contact"
 * for the note's own subject — confident. A pronoun, or a name matching ≠1
 * contact, is NEVER silently collapsed onto the note's contact: it defers to a
 * subject_resolution confirmation. Only a unique exact name match links now —
 * the same gate the object side (resolvePersonObject) uses.
 */
export async function resolveSubject(
  subject: string,
  noteContactId: string,
): Promise<SubjectResolution> {
  const trimmed = subject.trim();
  if (!trimmed || trimmed.toLowerCase() === "contact") {
    return { kind: "confident", contactId: noteContactId };
  }
  if (SUBJECT_PRONOUNS.includes(trimmed.toLocaleLowerCase())) {
    return { kind: "ambiguous", candidates: [] };
  }
  const candidates = await findRelationshipCandidates(trimmed);
  const lower = trimmed.toLocaleLowerCase();
  const exact = candidates.filter((c) => c.name.toLocaleLowerCase() === lower);
  if (candidates.length === 1 && exact.length === 1) {
    return { kind: "confident", contactId: candidates[0].id };
  }
  return { kind: "ambiguous", candidates };
}

/**
 * Resolve the relationship OBJECT. Concrete when unambiguous (company:
 * find-or-create; person/entity: unique exact match auto-links, exactly as
 * today), otherwise ambiguous — carrying the candidate options an entity_link
 * confirmation renders. Reuses the existing cardinality gates; the ambiguous
 * branch re-reads the candidates only to attach display labels.
 */
export async function resolveObject(rel: Relationship): Promise<ObjectResolution> {
  if (rel.object_type === "company") {
    return {
      kind: "concrete",
      dstType: "company",
      dstId: await findOrCreateCompany(rel.object),
    };
  }
  if (rel.object_type === "entity") {
    const resolution = await resolveEntityObject(rel.object);
    if (resolution.kind === "edge") {
      return { kind: "concrete", dstType: "entity", dstId: resolution.dstId };
    }
    const candidates = await findEntityCandidates(rel.object);
    return {
      kind: "ambiguous",
      objectType: "entity",
      entityTypeHint: rel.entity_type_hint,
      options: candidates.map((c) => ({ id: c.id, label: c.name, sublabel: c.typeName })),
    };
  }
  const resolution = await resolvePersonObject(rel.object);
  if (resolution.kind === "edge") {
    return { kind: "concrete", dstType: "contact", dstId: resolution.dstId };
  }
  const candidates = await findRelationshipCandidates(rel.object);
  return {
    kind: "ambiguous",
    objectType: "person",
    entityTypeHint: null,
    options: candidates.map((c) => ({ id: c.id, label: c.name, sublabel: c.title })),
  };
}

/**
 * Contacts the user can pick as the subject: the name matches when there are
 * any, otherwise the note's own contact — so a pronoun/unknown-name prompt is
 * always actionable (that contact is the most likely, but the user confirms
 * rather than us assuming it).
 */
export async function subjectOptions(
  candidates: RelationshipCandidate[],
  noteContactId: string,
): Promise<ConfirmationOption[]> {
  if (candidates.length > 0) {
    return candidates.map((c) => ({ id: c.id, label: c.name, sublabel: c.title }));
  }
  const db = await getDb();
  const [row] = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .where(eq(contacts.id, noteContactId))
    .limit(1);
  return row ? [{ id: row.id, label: row.name, sublabel: row.title }] : [];
}
