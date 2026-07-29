/**
 * Org-affiliation predicates — the vocabulary shared by `positions.relation`
 * (the stored role) and the affiliation edges the graph derives from it.
 */

/**
 * The stored predicate for a position edge. An explicit `relation` (studied_at,
 * interned_at, board_member_of, …) wins; a plain employment role falls back to
 * works_at / worked_at based on whether the role is current.
 */
export function affiliationPredicate(position: {
  relation: string | null;
  isCurrent: boolean;
}): string {
  return position.relation ?? (position.isCurrent ? "works_at" : "worked_at");
}

/** Org-affiliation predicates that denote schooling rather than employment. */
export const EDUCATION_PREDICATES = ["studied_at", "attended"] as const;

/** True when a predicate is an education affiliation (studied_at / attended). */
export function isEducationPredicate(predicate: string): boolean {
  return (EDUCATION_PREDICATES as readonly string[]).includes(predicate);
}

/**
 * Plain-employment predicates: a job with no special affiliation flavour to
 * record. `positions.relation` stays NULL for these — the manual editor's
 * "Employment" option and the importer both store NULL — and
 * affiliationPredicate() derives works_at / worked_at back from `isCurrent`.
 */
export const PLAIN_EMPLOYMENT_PREDICATES = [
  "works_at",
  "worked_at",
  "used_to_work_at",
] as const;

/**
 * Every org-affiliation predicate that denotes a POSITION a contact holds — a
 * job, an internship, a board seat, a degree. Predicates that link a person to
 * a company WITHOUT being a role (invests_in, customer_of, competitor_of) are
 * deliberately absent: they belong in the edge table, not `positions`.
 */
export const AFFILIATION_PREDICATES = [
  ...PLAIN_EMPLOYMENT_PREDICATES,
  "interned_at",
  "board_member_of",
  "advisor_to",
  "founder_of",
  "volunteers_at",
  ...EDUCATION_PREDICATES,
] as const;

/** True when a predicate records a position (employment or education). */
export function isAffiliationPredicate(predicate: string): boolean {
  return (AFFILIATION_PREDICATES as readonly string[]).includes(predicate);
}

/**
 * What to store in `positions.relation` for an affiliation predicate — the
 * inverse of affiliationPredicate(): NULL for plain employment (works_at /
 * worked_at are derived back from `isCurrent`), the predicate itself for
 * everything else (studied_at, interned_at, board_member_of, …).
 */
export function positionRelationFor(predicate: string): string | null {
  return (PLAIN_EMPLOYMENT_PREDICATES as readonly string[]).includes(predicate)
    ? null
    : predicate;
}
