// Unified confirmations feed (generalizes edge-suggestions). Import paths stay
// stable via this barrel: @/lib/repo/confirmations.
export {
  createEntityLinkConfirmation,
  createEnrichmentMatchConfirmation,
  createSupplementConfirmation,
  createSubjectResolutionConfirmation,
} from "./create";
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
} from "./apply";
