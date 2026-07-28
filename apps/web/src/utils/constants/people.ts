/** Human labels for why two contacts were grouped as likely duplicates. */
export const DUPLICATE_CONTACT_REASON_LABELS: Record<"email" | "phone" | "name", string> = {
  email: "Same email",
  phone: "Same phone",
  name: "Similar name",
};

/**
 * A relationship-type choice for a contact-form position row. `value` is the
 * stored `positions.relation` predicate (kept in sync with core's org-affiliation
 * predicates in RELATIONSHIP_ROLES); `null` means a plain employment role, which
 * affiliationPredicate() resolves to works_at / worked_at from `isCurrent`.
 */
export interface RelationOption {
  value: string | null;
  label: string;
}

/** Experience-row relationship types. Default Employment (null) → works_at/worked_at. */
export const AFFILIATION_RELATION_OPTIONS: readonly RelationOption[] = [
  { value: null, label: "Employment" },
  { value: "interned_at", label: "Internship" },
  { value: "founder_of", label: "Founder" },
  { value: "board_member_of", label: "Board member" },
  { value: "advisor_to", label: "Advisor" },
  { value: "volunteers_at", label: "Volunteer" },
];

/** Education-row relationship types — each stored as an EDUCATION_PREDICATES value. */
export const EDUCATION_RELATION_OPTIONS: readonly RelationOption[] = [
  { value: "studied_at", label: "Studied" },
  { value: "attended", label: "Attended / alumnus" },
];
