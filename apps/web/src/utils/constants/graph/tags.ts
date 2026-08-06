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
