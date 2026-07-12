/** Company drill-down cap on /app/graph — beyond this, show "+N more" and point at search. */
export const GRAPH_CLUSTER_CONTACT_CAP = 150;

/** Warm-path BFS hop cap — backstop only; contacts are always terminal past hop 0 (see warm-paths.ts). */
export const WARM_PATH_MAX_HOPS = 5;
