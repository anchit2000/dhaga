// Split per the 150-line rule; import paths unchanged (@/lib/repo/edge-suggestions).
export {
  createMentionedContact,
  findRelationshipCandidates,
  resolvePersonObject,
  type RelationshipCandidate,
  type PersonResolution,
} from "./candidates";
export { findBatchCandidates } from "./batch-candidates";
export {
  findEntityCandidates,
  resolveEntityObject,
  type EntityCandidate,
  type EntityResolution,
} from "./entity-candidates";
export { listPendingEdgeSuggestions, type EdgeSuggestionView } from "./queue";
export {
  confirmEdgeSuggestion,
  dismissEdgeSuggestion,
  type EdgeSuggestionTarget,
} from "./confirm";
