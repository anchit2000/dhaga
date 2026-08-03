import type { AiActionFeature } from "@dhaga/core";

/**
 * What each metered AI action is CALLED to the person who spent the credit.
 *
 * `ai_actions.feature` stores ids (`card_scan`, `signal_detection`) and nothing
 * user-facing may render one: the credits page reads "Card scan · 1 credit",
 * never "card_scan". Singular names one row of recent activity, plural names a
 * breakdown group.
 */
export const AI_ACTION_LABELS: Record<AiActionFeature, { one: string; many: string }> = {
  card_scan: { one: "Card scan", many: "Card scans" },
  contact_parse: { one: "Quick add", many: "Quick adds" },
  note_extraction: { one: "Note", many: "Notes" },
  search: { one: "Ask Dhaga", many: "Ask Dhaga" },
  draft: { one: "Follow-up draft", many: "Follow-up drafts" },
  brief: { one: "Pre-meeting brief", many: "Pre-meeting briefs" },
  enrichment: { one: "Deep research", many: "Deep research" },
  signal_detection: { one: "Watchlist scan", many: "Watchlist scans" },
  person_classification: { one: "Contact check", many: "Contact checks" },
  goal_matching: { one: "Goal match", many: "Goal matches" },
  goal_match_now: { one: "Goal match (requested)", many: "Goal matches (requested)" },
};

/** How many users the admin cost screen lists. Bounded because the point is
 *  "who is costing us the most", not a directory — and because resolving each
 *  one's plan and ceiling is real work against a three-connection pool. */
export const ADMIN_TOP_SPENDER_LIMIT = 10;

/**
 * History rows can carry a feature this build has never heard of — a renamed
 * action, or a self-hoster who rolled back. `creditsForAiAction` already charges
 * those the 1-credit floor rather than pretending they were free; the page gives
 * them a neutral name for the same reason, instead of leaking a raw id.
 */
export const UNKNOWN_AI_ACTION_LABEL = { one: "Other AI action", many: "Other AI actions" };

/**
 * Page size for the credits history list: how many rows the server-rendered
 * first page holds, and how many `getAiCreditActivityPageAction` fetches per
 * "Load more" click. `ai_actions` is append-only and grows for the life of the
 * account, so the list itself is NOT bounded — it pages through the whole
 * history via keyset cursors (see `listAiCreditActivityPage`). The month's
 * totals live in the breakdown above it, which is an aggregate and stays one
 * row per action *type* however long the account runs.
 */
export const AI_ACTIVITY_LIMIT = 20;
