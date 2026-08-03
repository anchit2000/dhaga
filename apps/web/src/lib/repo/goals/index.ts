// Import paths stay stable via this barrel: @/lib/repo/goals.
//
// Goal-driven curation, split by side: ./write (the lifecycle, where
// MAX_ACTIVE_GOALS is enforced), ./cohort (the daily slice and the derived
// burn-down), ./recall (retrieval for the nightly match pass — no LLM here).
export {
  archiveGoal,
  createGoal,
  getActiveGoal,
  markGoalDone,
  updateGoalObjective,
} from "./write";
export {
  getActiveGoalProgress,
  listGoalCohortSlice,
  orderGoalCohort,
  type GoalCohortMember,
  type GoalCohortSlice,
  type GoalProgress,
} from "./cohort";
export { recallGoalCandidates, type GoalRecallCandidate } from "./recall";
