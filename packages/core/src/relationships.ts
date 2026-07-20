/**
 * Direction-aware, human-readable labels for relationship edges.
 *
 * An edge is stored ONCE and directed: `src --predicate--> dst`, read as
 * "src is the {subject} of dst" / "dst is the {object} of src". When a
 * contact's relationships are rendered we show the OTHER person and how they
 * relate to the contact being viewed, so a single stored edge reads correctly
 * from both ends without persisting an inverse row (parent_of on one side is
 * shown as its inverse — child — on the other).
 */

export interface RelationshipRoles {
  /** What the source contact is to the destination (parent_of -> "parent"). */
  subject: string;
  /** What the destination is to the source (parent_of -> "child"). */
  object: string;
}

/**
 * Known predicates get a correct inverse; anything else falls back to the raw
 * predicate for both directions (see `relationshipRole`). Symmetric relations
 * (sibling, spouse, colleague) intentionally use the same word both ways.
 */
export const RELATIONSHIP_ROLES: Record<string, RelationshipRoles> = {
  parent_of: { subject: "parent", object: "child" },
  child_of: { subject: "child", object: "parent" },
  son_of: { subject: "son", object: "parent" },
  daughter_of: { subject: "daughter", object: "parent" },
  sibling_of: { subject: "sibling", object: "sibling" },
  spouse_of: { subject: "spouse", object: "spouse" },
  married_to: { subject: "spouse", object: "spouse" },
  partner_of: { subject: "partner", object: "partner" },
  friend_of: { subject: "friend", object: "friend" },
  reports_to: { subject: "report", object: "manager" },
  manages: { subject: "manager", object: "report" },
  mentor_of: { subject: "mentor", object: "mentee" },
  mentored_by: { subject: "mentee", object: "mentor" },
  // "Introduced" is directional but reads symmetric without an inverse (both
  // ends showed "introduced to"). The two slugs are grammatical mirrors of the
  // same fact — edges store src --predicate--> dst:
  //   introduced_by: src was introduced BY dst  → src=introducee, dst=introducer
  //   introduced_to: src introduced [→] dst      → src=introducer, dst=introducee
  // relationshipRole shows the OTHER endpoint's role (object when viewing src,
  // subject when viewing dst), so the introducee's page reads "introduced by
  // <introducer>" and the introducer's reads "introduced <introducee>".
  introduced_by: { subject: "introduced", object: "introduced by" },
  introduced_to: { subject: "introduced by", object: "introduced" },
  colleague_of: { subject: "colleague", object: "colleague" },
  worked_with: { subject: "colleague", object: "colleague" },
  works_with: { subject: "colleague", object: "colleague" },
};

/** Turn a snake_case predicate into a plain phrase ("used_to_work_at" -> "used to work at"). */
export function humanizePredicate(predicate: string): string {
  return predicate.replaceAll("_", " ").trim();
}

/**
 * User-defined predicates loaded at runtime (relationship_types rows), keyed
 * by slug: `forward` reads src->dst ("father of"), `inverse` dst->src.
 */
export type RelationshipLabelMap = Record<string, { forward: string; inverse: string }>;

/** Build the runtime label map from relationship_types rows (any source that
 *  carries slug + both labels), so every consumer keys it identically. */
export function buildRelationshipLabelMap(
  rows: readonly { slug: string; forwardLabel: string; inverseLabel: string }[],
): RelationshipLabelMap {
  const map: RelationshipLabelMap = {};
  for (const row of rows) {
    map[row.slug] = { forward: row.forwardLabel, inverse: row.inverseLabel };
  }
  return map;
}

/**
 * How the OTHER person in an edge relates to the contact being viewed.
 *
 * @param predicate       the stored edge predicate (e.g. "parent_of")
 * @param viewerIsSource  true when the viewed contact is the edge's `src`
 * @param custom          user-defined predicates; they win over built-ins so a
 *                        user can relabel a predicate without forking its slug
 * @returns               a short role/relation label for the other person
 *                        (viewerIsSource -> the object side; else the subject side)
 */
export function relationshipRole(
  predicate: string,
  viewerIsSource: boolean,
  custom?: RelationshipLabelMap,
): string {
  const labels = custom?.[predicate];
  // The forward label reads src->dst, so the OTHER person's role from the
  // source's seat is the inverse side — mirroring object/subject below.
  if (labels) return viewerIsSource ? labels.inverse : labels.forward;
  const roles = RELATIONSHIP_ROLES[predicate];
  if (roles) return viewerIsSource ? roles.object : roles.subject;
  // Unknown predicate: no reliable inverse, so show the relation as written.
  return humanizePredicate(predicate);
}
