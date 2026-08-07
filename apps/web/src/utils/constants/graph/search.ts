export const GRAPH_TARGET_SEARCH_DEBOUNCE_MS = 300;
export const GRAPH_TARGET_RESULTS_DISMISS_MS = 150;

/** Warm-path BFS hop cap — backstop only; contacts are always terminal past hop 0 (see warm-paths.ts). */
export const WARM_PATH_MAX_HOPS = 5;
/** Target kinds warm paths can actually reach — expand-hop only loads contacts/companies,
 *  so offering entity/event targets would guarantee a misleading "no thread" result. */
export const WARM_PATH_TARGET_KINDS: readonly string[] = ["contact", "company"];
