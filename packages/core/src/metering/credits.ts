/**
 * AI credits — the user-facing unit of cloud-AI usage.
 *
 * One credit is one card scan: the cheapest complete thing the product does,
 * and the one everybody already understands. Everything else is priced as a
 * whole multiple of it. Credits are charged per user-visible ACTION, not per
 * model call — a card scan spends one credit whether it takes one model
 * round-trip or three (see apps/web/src/lib/ai/metering).
 *
 * Derived from REAL API measurements taken 2026-07-30 (39 paid calls, n=3 per
 * action, production prompts and the 1024px downscale the client actually
 * sends) at Haiku 4.5 $1/$5 per MTok, Sonnet 5 $3/$15, Anthropic server-side
 * web search $10/1k. Measured cost per action:
 *
 *   card scan       $0.0042    quick add       $0.0022
 *   note            $0.0058    follow-up draft $0.0045
 *   Ask Dhaga       $0.0092    pre-meeting brief $0.0073
 *   deep research   $0.0975    watchlist scan  $0.0008 (Batch API)
 *
 * The blended ceiling those numbers imply is ~$0.006 of inference per credit.
 * Re-measure and re-derive whenever a prompt, model tier, or provider price
 * moves — docs/BRD.md §8.3 carries the numbers, the method, and the margins.
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
] as const;

export type AiActionFeature = (typeof AI_ACTION_FEATURES)[number];

/** Credit cost of one completed action of each kind. */
export const AI_ACTION_CREDITS: Record<AiActionFeature, number> = {
  /** Card/badge photos → a contact: a vision extraction plus the deferred
   *  verbatim transcription, both Haiku. The anchor — 1 credit by definition. */
  card_scan: 1,
  /** Pasted text / signature → a contact, one Haiku call. Half a scan's cost;
   *  not worth a fractional credit, so it rounds to the same 1. */
  contact_parse: 1,
  /** A note → facts, relationships and follow-ups. The tightest fit in this
   *  table at ~1.4× a scan — kept at 1 because "a note or a scan costs one
   *  credit" is worth more than the rounding. Re-check it first if note
   *  extraction ever grows a second model call.
   *
   *  A PHOTO note costs 2: reading the image is one action and extracting from
   *  the resulting text is another, because the extraction runs later in the
   *  background worker — a different process, which the in-request action scope
   *  cannot reach the way the card scan's id hand-off does. That happens to be
   *  cost-accurate (~$0.008, ~2 credits), so it stays until someone wants the
   *  two joined, which would mean carrying an action id on the job row. */
  note_extraction: 1,
  /** Ask Dhaga: a Haiku query plan plus a Sonnet answer over retrieved graph. */
  search: 2,
  /** A personalised follow-up draft, Sonnet over the contact's graph. */
  draft: 1,
  /** A pre-meeting brief, Sonnet over a wider slice of the graph. */
  brief: 2,
  /** Deep research: live web search (billed per search ON TOP of tokens) plus a
   *  Sonnet synthesis and a Haiku extraction pass. ~23× a card scan measured,
   *  and the only action whose real cost is dominated by something other than
   *  our own tokens — so it is the one users must feel, and the first number to
   *  re-check when provider search pricing moves. */
  enrichment: 20,
  /** One watched contact's nightly change scan. Free of credits on purpose:
   *  the user never asked for this particular scan, and the watchlist size cap
   *  (PRO_TIER_WATCHLIST_CAP) is already its throttle. Billing it would let a
   *  full watchlist quietly eat ~125 credits a month for ~$0.10 of Batch-API
   *  inference — a cap on a cap, charged to the wrong budget. */
  signal_detection: 0,
  /** One contact judged person-vs-service in the nightly Batch pass. Free of
   *  credits for the same reason as the watchlist scan: the user never asked
   *  for this particular judgement, and a per-night contact cap is already its
   *  throttle. ESTIMATED, not measured (the table above is 39 real calls; this
   *  is not): a 5,000-contact graph is classified once for roughly $2.4 of
   *  Batch inference — ~400 credits at the ~$0.006/credit blended ceiling,
   *  which is exactly why billing it would be wrong. Re-check once measured. */
  person_classification: 0,
  /** One contact judged against one user objective in the nightly Batch pass.
   *  Zero for the same reason and on the same ESTIMATED ~$2.4-per-5,000-contact
   *  sweep as person_classification — a separate feature from it, not one
   *  merged "curation" line, because the credits breakdown is per-feature and
   *  an operator debugging cost needs to know which pass burned it. */
  goal_matching: 0,
};

/**
 * Credits for an action feature read back from storage. History rows predate
 * some of these names, and a self-hoster can end up with a feature this build
 * has never heard of — an unknown action costs the 1-credit floor rather than
 * silently costing nothing.
 */
export function creditsForAiAction(feature: string): number {
  return AI_ACTION_CREDITS[feature as AiActionFeature] ?? 1;
}
