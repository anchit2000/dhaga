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
  cardTranscriptionSchema,
  type CardTranscription,
} from "./schemas/card-transcription";
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
  AFFILIATION_PREDICATES,
  EDUCATION_PREDICATES,
  PLAIN_EMPLOYMENT_PREDICATES,
  affiliationPredicate,
  buildRelationshipLabelMap,
  humanizePredicate,
  isAffiliationPredicate,
  isEducationPredicate,
  positionRelationFor,
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
export {
  contactMergeResolutionSchema,
  companyMergeResolutionSchema,
  computeScalarConflicts,
  type ContactMergeResolution,
  type CompanyMergeResolution,
  type MergeConflict,
} from "./schemas/merge";
export {
  CONFIRMATION_TYPES,
  confirmationOptionSchema,
  insertEdgeApplySchema,
  verifyFactApplySchema,
  applyExtractionApplySchema,
  resolveSubjectApplySchema,
  attachNoteApplySchema,
  entityLinkPayloadSchema,
  enrichmentMatchPayloadSchema,
  supplementPayloadSchema,
  subjectResolutionPayloadSchema,
  noteSubjectPayloadSchema,
  confirmationPayloadSchema,
  type ConfirmationType,
  type ConfirmationOption,
  type InsertEdgeApply,
  type VerifyFactApply,
  type ApplyExtractionApply,
  type ResolveSubjectApply,
  type AttachNoteApply,
  type EntityLinkPayload,
  type EnrichmentMatchPayload,
  type SupplementPayload,
  type SubjectResolutionPayload,
  type NoteSubjectPayload,
  type ConfirmationPayload,
} from "./schemas/confirmations";
export {
  captureClassificationSchema,
  captureExtractionSchema,
  emptyCaptureClassification,
  type CaptureClassification,
  type CaptureExtraction,
} from "./schemas/capture-classification";
export {
  routeNoteCapture,
  type CaptureRoute,
  type CaptureRoutingInput,
} from "./capture/route";
// Contact-sync merge core. Pure (no I/O, no native modules), so it is safe at
// the package root; the sync TARGETS are deep-import-only (see ./sync/index.ts)
// because the device target pulls expo-contacts, which the web bundle cannot load.
// Named Sync* rather than Merge* on purpose: ./schemas/merge already owns
// "merge" for de-duplicating two Dhaga contacts into one, which is a different
// operation from reconciling one contact against an external address book.
export { mergeSyncedContact } from "./sync/merge";
export {
  MULTI_FIELDS,
  SCALAR_FIELDS,
  type ContactSyncTarget,
  type ExternalContact,
  type ExternalRef,
  type MultiField,
  type ScalarField,
  type SyncableContact,
  type SyncConflict,
  type SyncContainer,
  type SyncField,
  type SyncMergeInput,
  type SyncMergeResult,
} from "./sync/types";
// Server PROVIDERS are root-safe (plain fetch) where the device target is not.
export {
  CONTACT_SYNC_NO_ACCESS,
  type ContactSyncCapabilities,
  type ContactSyncProvider,
  type ContactSyncProviderInfo,
  type ContactSyncTokens,
} from "./sync/provider-types";
export {
  contactSyncCapabilities,
  getContactSyncProvider,
  hasContactSyncProvider,
  listContactSyncProviders,
  registerContactSyncProvider,
} from "./sync/providers";
