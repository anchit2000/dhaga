/** Company drill-down cap on /app/graph — beyond this, show "+N more" and point at search. */
export const GRAPH_CLUSTER_CONTACT_CAP = 150;
export const GRAPH_EDGE_CONTEXT_CONTACT_CAP = 100;

/** Camera and layout values for the progressively explored graph world. */
export const GRAPH_CLUSTER_SPACING = 900;
export const GRAPH_LOCAL_RING_RADIUS = 120;
export const GRAPH_CONTACTS_PER_SHELL = 12;
export const GRAPH_SHELL_SPACING = 90;
export const GRAPH_INITIAL_ZOOM = 1;
export const GRAPH_FOCUS_ZOOM = 1.15;
export const GRAPH_MIN_ZOOM = 0.04;
export const GRAPH_MAX_ZOOM = 12;
export const GRAPH_CAMERA_DURATION_MS = 450;
export const GRAPH_VIEWPORT_MARGIN = 700;
export const GRAPH_INITIAL_VIEW_RADIUS = 1_200;
export const GRAPH_DIRECTION_PAN_RATIO = 0.8;
export const GRAPH_TARGET_SEARCH_DEBOUNCE_MS = 300;
export const GRAPH_TARGET_RESULTS_DISMISS_MS = 150;

/** Warm-path BFS hop cap — backstop only; contacts are always terminal past hop 0 (see warm-paths.ts). */
export const WARM_PATH_MAX_HOPS = 5;
