import type { ConfirmationOption, Relationship } from "@dhaga/core";
import {
  LEADING_POSSESSIVE,
  THIRD_PERSON_POSSESSIVE,
} from "@/utils/constants/relationships";
import { findOrCreateCompany } from "../../../contacts";
import {
  createMentionedContact,
  findEntityCandidates,
  findRelationshipCandidates,
  resolveEntityObject,
  resolvePersonObject,
} from "../../../edge-suggestions";

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
 * Display name for a bare-reference placeholder. The note's subject owns it, so
 * "his son" on a note about Prashant Pandey reads as "Prashant's son". Only a
 * third-person possessive is rewritten; anything else (a role phrase with no
 * possessive, or a missing owner name) keeps its raw phrase, so we never crash
 * or invent a wrong owner. First-person ("my son") is out of scope by design —
 * "my" points at the note's author, not the subject.
 */
function bareReferenceLabel(object: string, ownerName: string | null): string {
  const raw = object.trim();
  const ownerFirstName = ownerName?.trim().split(/\s+/)[0] ?? "";
  if (!ownerFirstName || !THIRD_PERSON_POSSESSIVE.test(raw)) return raw;
  const relationNoun = raw.replace(LEADING_POSSESSIVE, "").trim();
  return `${ownerFirstName}'s ${relationNoun}`;
}

/**
 * Resolve the relationship OBJECT. Concrete when unambiguous (company:
 * find-or-create; person/entity: unique exact match auto-links, exactly as
 * today), otherwise ambiguous — carrying the candidate options an entity_link
 * confirmation renders. Reuses the existing cardinality gates; the ambiguous
 * branch re-reads the candidates only to attach display labels.
 *
 * `ownerName` is the note's subject contact's name, used only to relabel a bare
 * relative/role reference off its owner (see bareReferenceLabel).
 */
export async function resolveObject(
  rel: Relationship,
  ownerName: string | null,
): Promise<ObjectResolution> {
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
  // A bare relative/role reference ("his son") names nobody. The model flags it
  // (object_is_named === false); as a backstop for when the model didn't decide
  // (null), a leading third-person possessive triggers the same handling. Either
  // way it becomes a fresh note-scoped placeholder relabelled off the note's
  // subject ("Prashant's son") — never routed through name-match disambiguation,
  // which would risk silently merging two unrelated "his son"s. An explicit
  // object_is_named === true is never treated as bare: a named person stays named.
  const isBareReference =
    rel.object_is_named === false ||
    (rel.object_is_named !== true && THIRD_PERSON_POSSESSIVE.test(rel.object.trim()));
  if (isBareReference) {
    return {
      kind: "concrete",
      dstType: "contact",
      dstId: await createMentionedContact(rel.object, bareReferenceLabel(rel.object, ownerName)),
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
