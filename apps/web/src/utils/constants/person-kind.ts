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
