// Data models: Zod schemas shared across app/web/extension/server, plus the
// relationship-label helpers. Re-exported from index.ts via `export *`.
export {
  extractedContactSchema,
  contactProfileSchema,
  emptyExtractedContact,
  emptyContactProfile,
  profileFromExtracted,
  primaryPosition,
  type ExtractedContact,
  type ContactProfile,
} from "./schemas/contact";
export {
  contactMethodSchema,
  positionSchema,
  addressSchema,
  importantDateSchema,
  customFieldSchema,
  normalizeContactMethod,
  normalizeContactMethods,
  methodValues,
  type ContactMethod,
  type Position,
  type Address,
  type ImportantDate,
  type CustomField,
} from "./schemas/contact-fields";
export {
  searchQueryPlanSchema,
  type SearchQueryPlan,
} from "./schemas/search-query";
export { cardScanSchema, type CardScan } from "./schemas/card-scan";
export {
  FACT_TYPES,
  RELATIONSHIP_PREDICATES,
  factSchema,
  relationshipSchema,
  followUpSchema,
  noteExtractionSchema,
  type Fact,
  type Relationship,
  type FollowUp,
  type NoteExtraction,
} from "./schemas/extraction";
export {
  RELATIONSHIP_ROLES,
  buildRelationshipLabelMap,
  humanizePredicate,
  relationshipRole,
  type RelationshipLabelMap,
  type RelationshipRoles,
} from "./relationships";
export {
  SIGNAL_KINDS,
  signalDetectionSchema,
  type SignalDetection,
  type SignalKind,
} from "./schemas/signal";
