/**
 * The set of metered AI actions. An ACTION is one user-visible thing (a card
 * scan, a search, one batch planned) — never one model call: an action that
 * takes three round-trips is still one action. Prices live in ./table.
 */
export const AI_ACTION_FEATURES = [
  "card_scan",
  "contact_parse",
  "note_extraction",
  "search",
  "draft",
  "brief",
  "enrichment",
  "signal_detection",
  "person_classification",
  "goal_matching",
  "goal_match_now",
  "batch_plan",
] as const;

export type AiActionFeature = (typeof AI_ACTION_FEATURES)[number];
