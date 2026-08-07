/**
 * Proactive-intelligence watchlist (BRD §5.2 v1.2, §6.7): job-change
 * detection + news alerts, both opt-in per contact. The cap bounds nightly
 * job cost (search + a classification call per watched contact), separate
 * from the monthly AI-action cap that throttles user-triggered calls.
 */
export const FREE_TIER_WATCHLIST_CAP = 0; // free plan has no `enrichment` feature at all
export const PRO_TIER_WATCHLIST_CAP = 25;

/** How many new signals the Home feed shows before "+N more". */
export const SIGNALS_FEED_LIMIT = 8;

/** How many notes/facts the Home feed's contact detail panel previews. */
export const CONTACT_SUMMARY_NOTE_LIMIT = 3;
export const CONTACT_SUMMARY_FACT_LIMIT = 3;
