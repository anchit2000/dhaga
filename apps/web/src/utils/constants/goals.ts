/** Goal-driven curation: sizing for the goal cohort and its daily slice. */

/**
 * One goal at a time. The schema supports N per user — only this write guard
 * says 1, so raising it is a product decision, not a migration. Kept at 1
 * because Today shows one goal's slice: a second active goal would either
 * halve the slice or make the tile a list of lists.
 */
export const MAX_ACTIVE_GOALS = 1;

/** An objective is a sentence, not a brief — long enough to be specific, short
 * enough that the model reasons over intent rather than a document. */
export const GOAL_OBJECTIVE_MAX_CHARS = 200;

/** People shown for the goal per day. Three is a day's worth of reaching out;
 * a longer list reads as a backlog and gets ignored wholesale. */
export const GOAL_DAILY_SLICE = 3;

/** Ceiling on matched members per goal. At GOAL_DAILY_SLICE/day this is over a
 * month of runway — matching more would be work the user never reaches. */
export const GOAL_COHORT_MAX = 100;

/** Contacts the retrieval step pulls before the model ranks them. Wider than
 * GOAL_COHORT_MAX so ranking has something to reject; every candidate costs
 * prompt tokens, so it is not "the whole graph". */
export const GOAL_RECALL_POOL = 150;

/** Rank spread (0..100) treated as a tie when picking the daily slice. Within a
 * band the order is by last touch, so the model's noisy fit score doesn't
 * outrank "you spoke to them yesterday". */
export const GOAL_RANK_BAND = 25;

/** Hard cap on contacts one match run may judge — the cost fuse on the nightly
 * Batch pass, so a newly imported 10k-contact graph can't bill a user for a
 * single run. The remainder is picked up by the next run. */
export const GOAL_MATCH_RUN_CAP = 150;

/**
 * Hard cap on contacts ONE synchronous resolve may judge (lib/ai/goal-resolve).
 * The cost fuse per resolve, and the fan-out bound: the sync path judges its
 * candidates concurrently, so this is also how many Anthropic calls one save
 * can open at once.
 *
 * Sized at what recall can actually return — `hybridSearch` slices at 20 — so
 * it costs nothing today and stays a real ceiling if that slice ever widens.
 * Arithmetic: sync Haiku (no Batch discount) at ~720 in / 45 out ≈ $0.00094 a
 * contact, so one resolve is at most 20 × $0.00094 ≈ $0.019.
 */
export const GOAL_SYNC_RESOLVE_CAP = 20;

/** Member states. No "done": done is DERIVED from the contact's last touch
 * moving past matched_at (see lib/db/ddl/core/goals.ts). */
export const GOAL_STATES = ["pending", "skipped"] as const;

/** Goal lifecycle. "done" = the user got what they wanted; "archived" = they
 * stopped caring. Both stop matching, but only one is a success. */
export const GOAL_STATUSES = ["active", "done", "archived"] as const;
