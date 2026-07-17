import { EVENT_COLORS } from "./events";

export const GRAPH_TARGET_SEARCH_DEBOUNCE_MS = 300;
export const GRAPH_TARGET_RESULTS_DISMISS_MS = 150;

/** Warm-path BFS hop cap — backstop only; contacts are always terminal past hop 0 (see warm-paths.ts). */
export const WARM_PATH_MAX_HOPS = 5;
/** Target kinds warm paths can actually reach — expand-hop only loads contacts/companies,
 *  so offering entity/event targets would guarantee a misleading "no thread" result. */
export const WARM_PATH_TARGET_KINDS: readonly string[] = ["contact", "company"];

/** Node kinds an edge endpoint may reference ('person' is legacy, normalized to 'contact' by DDL). */
export const RELATIONSHIP_ENDPOINT_KINDS = ["contact", "company", "event", "entity"] as const;
/** Short human labels for endpoint kinds (target-picker badges, kind chips). */
export const RELATIONSHIP_KIND_LABELS: Record<
  (typeof RELATIONSHIP_ENDPOINT_KINDS)[number],
  string
> = { contact: "Person", company: "Company", event: "Event", entity: "Entity" };
/** snake_case predicate/type slugs, e.g. "father_of" — required for stored predicates. */
export const PREDICATE_SLUG_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
/** Node-type colors are plain hex (#rgb or #rrggbb). */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** Node-type swatch choices (stored as raw hex) — reuses the event palette,
 *  already curated to stay distinct and readable on both /app themes. */
export const NODE_TYPE_COLOR_SWATCHES: readonly string[] = EVENT_COLORS.map(
  (color) => color.hex,
);

/* ── Sigma renderer (full-load graph on /app/graph) ───────────────────── */

/** Node fill per kind; entity nodes use their node_type.color from the payload. */
export const GRAPH_NODE_COLORS: Record<"contact" | "company" | "event" | "tag", string> = {
  contact: "#e2a44c",
  company: "#6b8afd",
  event: "#4cc38a",
  tag: "#a78bfa",
};
/** Entities whose node type is missing from the payload (deleted mid-flight). */
export const GRAPH_ENTITY_FALLBACK_COLOR = "#7c9ce8";

/** Node size = sqrt(degree)-scaled, clamped to this range (display units). */
export const GRAPH_NODE_SIZE_MIN = 2;
export const GRAPH_NODE_SIZE_MAX = 9;
/** Base edge thickness (display units) — main-payload + tag-layer edges. */
export const GRAPH_EDGE_SIZE = 0.5;
/** Collapsed company/event group nodes scale up to signal they hold members. */
export const GRAPH_COLLAPSED_GROUP_SCALE = 1.5;

export const GRAPH_CAMERA_DURATION_MS = 450;
/** Above this node count, edges are hidden while the camera moves (GPU relief). */
export const GRAPH_HIDE_EDGES_ON_MOVE_THRESHOLD = 5_000;
/** Edge click events (popover) are enabled only under this edge count — sigma's
 *  edge picking has precision quirks and a picking cost; the node side panel is
 *  the primary edge-inspection UX at scale. */
export const GRAPH_EDGE_EVENTS_MAX_EDGES = 10_000;
/** Sigma skips node labels rendered smaller than this (px). */
export const GRAPH_LABEL_SIZE_THRESHOLD = 8;
/** Floor for camera.ratio in zoomToSizeRatioFunction: sigma inflates rendered size
 *  by 1/sqrt(ratio), so 0.05 caps it at ~4.5× — deep zoom (minCameraRatio 0.005) spreads clusters without ballooning nodes; keep GRAPH_NODE_SIZE_MIN×4.5 (9) ≥ GRAPH_LABEL_SIZE_THRESHOLD (8) so every label eventually appears at deep zoom. */
export const GRAPH_ZOOM_SIZE_RATIO_FLOOR = 0.05;
/** Camera ratio below which edge labels render (hovered/selected always render). */
export const GRAPH_EDGE_LABEL_RATIO_THRESHOLD = 0.2;

/* ── Tag layer budgets (GET /api/graph/tags) ──────────────────────────── */

/** Tag spoke edges ship inline with the tag-layer payload only while the
 *  TOTAL (contact, tag) pair count stays at or under this. Measured envelope:
 *  round-1 load test proved 84k edges render and sweep fine; round-2's 873k
 *  pairs caused 3-8s reducer sweeps and ~100MB payloads. 60k keeps the worst
 *  inline case comfortably inside the proven-good zone while leaving reducer
 *  headroom for the rest of the graph's edges. Over budget the endpoint
 *  returns hubs only (aggregate-bounded) and spokes load per tag on demand. */
export const GRAPH_TAG_EDGE_BUDGET = 60_000;
/** Hubs need at least this many distinct members to ship — a one-member hub
 *  adds zero connective value (its lone spoke links nothing to anything the
 *  contact node doesn't already say). Without the floor, per-contact-unique
 *  tags make hub count degenerate to contact count (measured: 940,521 hubs /
 *  117.75MB payload / 25.7s fetch / 38.6s merge with a 7.8s freeze). */
export const GRAPH_TAG_HUB_MIN_MEMBERS = 2;
/** Hard ceiling on hubs shipped, largest memberCount first (slug ASC
 *  tiebreak, so the cut is deterministic across fetches). The payload says
 *  hubsTruncated + totalHubs so the client can name what was cut. */
export const GRAPH_TAG_HUB_CAP = 3_000;
/** Spokes returned per ?tag={slug} fetch, deterministically ordered — a hub
 *  with more members shows the first 2,000 and "+N more" in the node panel.
 *  2,000 spokes merge in one frame and keep a single isolate readable. */
export const GRAPH_TAG_SPOKE_CAP = 2_000;
/** Hard client ceiling on TOTAL merged tag edges (initial + per-tag loads).
 *  A per-tag fetch that would cross it is refused with a toast — fail loud
 *  rather than letting accumulated loads degrade the frame rate. */
export const GRAPH_TAG_MERGE_CEILING = GRAPH_TAG_EDGE_BUDGET * 2;

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
