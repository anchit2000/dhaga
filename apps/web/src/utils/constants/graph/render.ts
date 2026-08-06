/* ── Sigma renderer (full-load graph on /app/graph) ───────────────────── */

/** The /app theme a graph palette is resolved for (next-themes' resolvedTheme). */
export type GraphColorScheme = "light" | "dark";
/** Node kinds with a fixed brand fill — entities carry their node_type.color. */
export type GraphPaletteKind = "contact" | "company" | "event" | "tag";

/** Node fill per kind, per theme. Dark keeps the original brand fills; the
 *  light set is the same hue families darkened until each clears WCAG 3:1
 *  against the light canvas (--brand-ink #f2ebdc) — the dark fills sit at
 *  1.8–2.7:1 there, i.e. pastel smudges on cream. Resolve through
 *  resolveGraphTheme()/graphNodePalette(), never index a scheme by hand. */
export const GRAPH_NODE_COLORS: Record<
  GraphColorScheme,
  Record<GraphPaletteKind, string>
> = {
  dark: { contact: "#e2a44c", company: "#6b8afd", event: "#4cc38a", tag: "#a78bfa" },
  light: { contact: "#a8641a", company: "#3a56c4", event: "#1f7a4d", tag: "#6d45c9" },
};
/** Entities whose node type is missing from the payload (deleted mid-flight). */
export const GRAPH_ENTITY_FALLBACK_COLOR: Record<GraphColorScheme, string> = {
  dark: "#7c9ce8",
  light: "#3f63b5",
};
/** Idle edge fill on the light canvas (2.44:1 on --brand-ink). Dark edges ride
 *  --brand-seam, but light seam (#c8b79a) is 1.28:1 — the whole mesh vanishes,
 *  so light needs a value of its own rather than a token. */
export const GRAPH_LIGHT_EDGE_COLOR = "#a89579";

/** Node size = sqrt(degree)-scaled, clamped to this range (display units). */
export const GRAPH_NODE_SIZE_MIN = 2;
export const GRAPH_NODE_SIZE_MAX = 9;
/** Base edge thickness (display units) — main-payload + tag-layer edges. */
export const GRAPH_EDGE_SIZE = 0.5;
/** Emphasised edge thickness on hover/selection/path. The arrowhead scales with
 *  thickness in sigma's EdgeArrowProgram, so this is what makes the direction
 *  arrow legible. Applied to outgoing edges of the hovered node (subject side)
 *  and to all selected/path edges. */
export const GRAPH_EDGE_ACTIVE_SIZE = 2.8;
/** Emphasised thickness for edges *incoming* to the hovered node — clearly
 *  thicker than idle but a notch below the outgoing size so the subject side
 *  (the fatter amber arrow leaving the node) reads at a glance. */
export const GRAPH_EDGE_INCOMING_SIZE = 1.8;
/** Collapsed company/event group nodes scale up to signal they hold members. */
export const GRAPH_COLLAPSED_GROUP_SCALE = 1.5;

export const GRAPH_CAMERA_DURATION_MS = 450;
/** Camera-ratio multiplier per zoom-button press: divide to zoom in, multiply
 *  to zoom out (clamped to the renderer's min/max camera ratio). */
export const GRAPH_ZOOM_STEP = 1.4;
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
