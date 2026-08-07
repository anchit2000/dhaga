/** Simultaneously enabled group circles — hull redraw per frame must stay cheap at 20k nodes. */
export const GRAPH_MAX_ENABLED_CIRCLES = 8;
export const GRAPH_SEARCH_RESULT_CAP = 8;
/** Side-panel incoming/outgoing lists cap (an event can have thousands of attendees). */
export const GRAPH_PANEL_EDGE_ROW_CAP = 50;

export const GRAPH_LAYERS_STORAGE_KEY = "dhaga.graph.hidden-layers.v1";
export const GRAPH_POSITIONS_STORAGE_KEY = "dhaga.graph.positions.v1";
/** Don't persist position caches beyond this — localStorage quota is ~5MB total. */
export const GRAPH_POSITIONS_MAX_BYTES = 3_000_000;

/** FA2 iterations by node count: [maxNodes, iterations][] — layout must settle
 *  < 15s at 20k nodes on mid hardware (measured ~6.7s/50 iters on UHD 620). */
export const GRAPH_FA2_ITERATION_TIERS: readonly (readonly [number, number])[] = [
  [1_000, 300],
  [5_000, 200],
  [20_000, 120],
  [Number.POSITIVE_INFINITY, 80],
];
/** Worker posts progress after each chunk of iterations. */
export const GRAPH_FA2_CHUNK_ITERATIONS = 10;
/** Stop early when mean per-node movement in a chunk falls below this fraction of layout radius. */
export const GRAPH_FA2_SETTLE_RATIO = 0.0005;
/** Reuse a stale position cache as warm start when ≥ this fraction of nodes are covered. */
export const GRAPH_WARM_START_MIN_OVERLAP = 0.9;
/** Short refine pass after placing uncached nodes at their neighbours' centroid. */
export const GRAPH_REFINE_ITERATIONS = 20;

/* ── Caching tiers: server layout (L2) + IndexedDB payload cache ────────── */

/** graph_layouts.key — one saved layout per user until named layouts exist. */
export const GRAPH_LAYOUT_DEFAULT_KEY = "default";
/** POST /api/graph/layout body cap — 50k nodes serialize to ~2.5MB, so 8MB
 *  rejects only runaway payloads without ever clipping a legitimate graph. */
export const GRAPH_LAYOUT_MAX_BYTES = 8_000_000;
/** Settled-layout uploads coalesce over this window (fire-and-forget POST). */
export const GRAPH_LAYOUT_UPLOAD_DEBOUNCE_MS = 2_000;
/** localStorage key remembering the last layout hash this browser uploaded —
 *  IDB-cached payloads freeze the pre-upload server state, so without this
 *  every warm boot re-POSTed an identical layout. */
export const GRAPH_LAYOUT_UPLOADED_KEY = "dhaga.graph.layout.uploaded.v1";
/** How long ?focus= waits for a background-revalidation swap to surface a
 *  node missing from the boot payload before giving up with a toast. */
export const GRAPH_FOCUS_SWAP_GRACE_MS = 10_000;

/** IndexedDB payload cache (stale-while-revalidate; the multi-MB payload
 *  doesn't fit localStorage's ~5MB total quota alongside the position cache). */
export const GRAPH_PAYLOAD_IDB_NAME = "dhaga.graph";
export const GRAPH_PAYLOAD_IDB_STORE = "payload";
export const GRAPH_PAYLOAD_IDB_KEY = "full.v1";

/** Tier-3 tripwires: past these counts the full-load + client-FA2 design is
 *  out of headroom — see the caching-tier PR's Tier-3 follow-ups (server-side
 *  layout jobs, payload slimming, viewport streaming) before growing further.
 *  console.warn only; nothing is truncated. */
export const GRAPH_TIER3_NODE_TRIPWIRE = 50_000;
export const GRAPH_TIER3_EDGE_TRIPWIRE = 150_000;
