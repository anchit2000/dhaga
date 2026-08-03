/**
 * Person-vs-service classification: the nightly sweep that keeps bulk-imported
 * address-book noise ("Vegetable Vendor", "Ola Support") off proactive
 * surfaces. The `person_kind` values themselves live in
 * @dhaga/core (schemas/person-kind) — one definition, shared with the
 * extraction schema, same as SIGNAL_KINDS.
 */

/**
 * Hard cap on contacts one classification run may judge. Higher than the goal
 * match cap because this is a one-off backfill per row (a classified contact is
 * never re-judged) rather than a recurring cost, and a freshly imported address
 * book needs to drain in days, not months.
 */
export const PERSON_CLASSIFICATION_RUN_CAP = 1000;

/**
 * Hard cap on the NOMINATION POOL one run draws from — the number that decides
 * what the pass actually costs, since the pool is always far smaller than the
 * due set (lib/jobs/classify-people/pool.ts).
 *
 * Sized off the two surfaces an un-acted-on contact can reach: the going-quiet
 * tile shows QUIET_FEED_LIMIT (8) and the daily-suggestion graph fallback takes
 * at most MAX_DAILY_SUGGESTION_COUNT × SUGGESTION_SOURCE_LIMIT_FACTOR (40) —
 * ~48 visible slots. 200 is ~4× that, so ordinary churn in either ordering
 * (someone moves into the top 8 as a relationship decays) is already judged
 * rather than waiting a night.
 *
 * Arithmetic, which is the whole point of the narrowing: Batch Haiku at
 * ~$0.00047 a contact makes 200 contacts ≈ $0.09, ONCE. Sweeping a real
 * 5,000-contact address book is 5,000 × $0.00047 ≈ $2.35 spread over ~5 nights
 * at PERSON_CLASSIFICATION_RUN_CAP — paid to judge thousands of rows that no
 * proactive surface could ever have nominated.
 */
export const PERSON_CLASSIFICATION_POOL_CAP = 200;

/**
 * Who set `person_kind`. "user" is a LOCK, not provenance trivia: the sweep
 * skips those rows entirely, so a correction survives every later run.
 */
export const PERSON_KIND_BY = ["model", "user"] as const;

/**
 * UI copy. "Not a person" rather than "service" because the user is being asked
 * about a row in their address book, not about a taxonomy; the by-model /
 * by-user split is shown so a wrong guess is visibly Dhaga's, and appealable.
 */
export const PERSON_KIND_LABELS = {
  service: "Not a person",
  byModel: "Dhaga's guess",
  byUser: "You marked this",
} as const;
