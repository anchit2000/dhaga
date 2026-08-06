// Unified confirmations feed (generalizes edge-suggestions). Import paths stay
// stable via this barrel: @/lib/repo/confirmations.
export {
  createEntityLinkConfirmation,
  createEnrichmentMatchConfirmation,
  createSupplementConfirmation,
  createSubjectResolutionConfirmation,
  createNoteSubjectConfirmation,
} from "./create";
export type { ConfirmationOrigin } from "./insert";
export { createFollowUpDateConfirmation } from "./follow-up-date";
export {
  listPendingConfirmations,
  countPendingConfirmations,
  type ConfirmationView,
} from "./queue";
export { resolveConfirmation, dismissConfirmation } from "./resolve";
export {
  applyConfirmation,
  type ConfirmationChoice,
  type ConfirmationResult,
  type NoteSubjectChoice,
} from "./apply";
