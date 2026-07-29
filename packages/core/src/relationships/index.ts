// Relationship vocabulary: edge role labels (./roles) and the org-affiliation
// predicates positions are stored with (./affiliation). Re-exported here so
// `./relationships` stays the one import path for both.
export {
  RELATIONSHIP_ROLES,
  buildRelationshipLabelMap,
  humanizePredicate,
  relationshipRole,
  type RelationshipLabelMap,
  type RelationshipRoles,
} from "./roles";
export {
  AFFILIATION_PREDICATES,
  EDUCATION_PREDICATES,
  PLAIN_EMPLOYMENT_PREDICATES,
  affiliationPredicate,
  isAffiliationPredicate,
  isEducationPredicate,
  positionRelationFor,
} from "./affiliation";
