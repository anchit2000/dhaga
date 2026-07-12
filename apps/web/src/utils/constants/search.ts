/**
 * Hybrid search scoring weights — heuristic, not scientifically tuned, same
 * ad hoc spirit as the flat weights they extend. Each source's score is
 * `ts_rank(...) * weight` (or a flat weight for trigram fragment matches,
 * which have no rank), summed per contact across every source that matched.
 */
export const SEARCH_WEIGHT_SEMANTIC = 4;
export const SEARCH_WEIGHT_IDENTITY = 10;
export const SEARCH_WEIGHT_TRIGRAM = 3;
export const SEARCH_WEIGHT_FACTS = 8;
export const SEARCH_WEIGHT_FOLLOW_UPS = 6;
export const SEARCH_WEIGHT_SESSIONS = 6;
export const SEARCH_WEIGHT_SIGNALS = 5;
export const SEARCH_WEIGHT_NOTES = 4;

/** ts_headline options: custom \x01 markers (stripped after) instead of the
 *  default <b>/</b> so plain-text snippet rendering never leaks HTML. */
export const SEARCH_HEADLINE_OPTS = "StartSel=\x01, StopSel=\x01, MaxWords=24, MinWords=6";
