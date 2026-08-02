/**
 * Copy + asset paths for the public interactive graph sandbox
 * (components/landing/NetworkSandbox). The two JSON assets are baked offline by
 * scripts/export-public-graph.mjs and served statically from /public — nothing
 * here loads until the visitor clicks the launch CTA.
 */

export const SANDBOX_EYEBROW = "Try it";
export const SANDBOX_HEADING = "Play with a real-scale network";
export const SANDBOX_INTRO =
  "This is a fully synthetic, anonymized graph — thousands of people, companies and events you can pan, zoom and pull apart right in the page. Click any node to isolate its circle. Nothing loads until you ask.";

export const SANDBOX_LAUNCH_CTA = "Load the interactive network";
export const SANDBOX_EXPLODE_CTA = "Explode to full network";
export const SANDBOX_WATERMARK = "made with Dhaga";

/** Baked, anonymized assets (scripts/export-public-graph.mjs). */
export const SANDBOX_CORE_ASSET = "/network-sandbox/graph-core.json";
export const SANDBOX_FULL_ASSET = "/network-sandbox/graph-full.json";
export const FEATURE_GRAPH_ASSET = "/network-sandbox/feature-graph.json";

/** Human node-count labels for the teaser + explode affordances. */
export const SANDBOX_CORE_NODE_LABEL = "~4,500 nodes";
export const SANDBOX_FULL_NODE_LABEL = "21k nodes";
export const SANDBOX_TEASER_NOTE = "Anonymized demo network · loads only when you click";
