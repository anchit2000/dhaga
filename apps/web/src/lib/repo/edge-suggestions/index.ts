// Split per the 150-line rule; import paths unchanged (@/lib/repo/edge-suggestions).
export {
  findRelationshipCandidates,
  resolvePersonObject,
  type RelationshipCandidate,
  type PersonResolution,
} from "./candidates";
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
