// Import paths stay stable via this barrel: @/lib/repo/goals.
//
// Goal-driven curation, split by side: ./write (the lifecycle, where
// MAX_ACTIVE_GOALS is enforced), ./cohort (the cohort and today's slice),
// ./progress (the burn-down plus the derived resolution state), ./recall
// (retrieval for a match pass — no LLM here), ./subjects (the graph context a
// match prompt judges on), ./members (how a pass records its outcome),
// ./pointer (the nightly batch pointer, parsed for both the job and the UI).
export {
  archiveGoal,
  createGoal,
  getActiveGoal,
  markGoalDone,
  updateGoalObjective,
} from "./write";
export {
  listGoalCohortSlice,
  loadCohort,
  orderGoalCohort,
  type CohortRow,
  type GoalCohortMember,
  type GoalCohortSlice,
} from "./cohort";
export {
  getActiveGoalProgress,
  type GoalProgress,
  type GoalResolutionState,
} from "./progress";
export { recallGoalCandidates, type GoalRecallCandidate } from "./recall";
export { loadGoalSubjectContext, type GoalSubjectContext } from "./subjects";
export { recordGoalMatchRun, toRank, type GoalMatchVerdict } from "./members";
export {
  formatGoalMatchPointer,
  parseGoalMatchPointer,
  readGoalMatchPointer,
  type GoalMatchPointer,
} from "./pointer";
