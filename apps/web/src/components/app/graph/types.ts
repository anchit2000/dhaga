/**
 * Wire types for GET /api/graph/full live in lib/repo/graph-data/types — the
 * one source of truth. Re-exported here type-only: `import type` is fully
 * erased at compile time, so no server code can reach this client bundle.
 */

import type {
  FullGraphEdge,
  FullGraphNode,
  FullGraphPayload,
  GraphLayoutSnapshot,
  TagLayerHub,
  TagLayerPayload,
  TagSpokesPayload,
} from "@/lib/repo/graph-data/types";

export type {
  FullGraphEdge,
  FullGraphNode,
  FullGraphPayload,
  GraphLayoutSnapshot,
  TagLayerHub,
  TagLayerPayload,
  TagSpokesPayload,
};

export type GraphNodeKind = FullGraphNode["kind"];
export type GraphEdgeKind = FullGraphEdge["kind"];
export type GraphNodeType = FullGraphPayload["nodeTypes"][number];
export type GraphRelationshipType = FullGraphPayload["relationshipTypes"][number];

/** id → position, in graph coordinates. */
export type PositionMap = Map<string, { x: number; y: number }>;

/**
 * Layer key: a built-in kind ("contact" | "company" | "event" | "tag") or a
 * custom node-type id for entity nodes. One visibility state feeds both the
 * layers panel and the type multi-select.
 */
export type LayerKey = string;

/** View state the sigma reducers read every refresh — kept minimal and flat. */
export interface GraphViewState {
  hiddenLayers: ReadonlySet<LayerKey>;
  collapsedGroups: ReadonlySet<string>;
  isolateRootId: string | null;
  selectedId: string | null;
  /** Warm-path (or other) emphasis: when set, these nodes glow, the rest dim. */
  highlightedPath: ReadonlySet<string> | null;
}
