export interface GraphTarget {
  id: string;
  label: string;
  kind: "contact" | "company" | "entity" | "event";
  /** Disambiguator for duplicate names: contact title · company, company
   *  sector, event date, entity type. Null when nothing is known. */
  sublabel: string | null;
}

export interface FullGraphNode {
  id: string;
  kind: "contact" | "company" | "event" | "entity" | "tag";
  /** entity nodes only: node_types.id */
  typeId?: string;
  label: string;
  sublabel: string | null;
  /** tag hubs only: distinct tagged contacts (server aggregate) — sizes the
   *  hub and lets the node panel show "+N more" when spokes are capped. */
  memberCount?: number;
}

export interface FullGraphEdge {
  id: string;
  source: string; // node id
  target: string;
  predicate: string; // snake_case
  kind: "explicit" | "works_at" | "attended" | "tagged";
}

/** Server-persisted settled layout for one graph state (repo/graph-layouts.ts). */
export interface GraphLayoutSnapshot {
  /** Client-computed graphHash (logic/position-cache.ts) the positions settle. */
  hash: string;
  positions: Record<string, [number, number]>;
}

export interface FullGraphPayload {
  nodes: FullGraphNode[];
  edges: FullGraphEdge[];
  nodeTypes: { id: string; name: string; slug: string; color: string }[];
  relationshipTypes: { id: string; slug: string; forwardLabel: string; inverseLabel: string }[];
  /** The user's saved layout, if any — lets a fresh device skip FA2 (L2). */
  layout?: GraphLayoutSnapshot | null;
}

/** Tag hub node for the lazily-loaded tag layer; id is `tag:{slug}`. */
export interface TagLayerHub {
  id: string;
  label: string;
  slug: string;
  /** Distinct tagged contacts — from the hub aggregate (bounded by the
   *  distinct-tag count, never the pair count). Sizes the hub client-side. */
  memberCount: number;
}

/** Contact→hub membership edge; id is `tagged:{slug}:{contactId}`. */
export interface TagLayerEdge {
  id: string;
  source: string; // contact id
  target: string; // `tag:{slug}`
}

/**
 * GET /api/graph/tags — tag hubs + tagged edges are the graph's one unbounded
 * pair-multiplier (contacts × tags), so they're excluded from the full payload
 * and merged client-side when the Tags layer is first enabled. Hubs arrive
 * SQL-bounded (min-member floor + GRAPH_TAG_HUB_CAP); spoke edges only while
 * totalPairs ≤ GRAPH_TAG_EDGE_BUDGET.
 */
export interface TagLayerPayload {
  hubs: TagLayerHub[];
  /** Empty when truncated — over-budget spokes load per tag on demand. */
  edges: TagLayerEdge[];
  truncated: boolean;
  /** (contact, tag) pairs over the SHIPPED hubs only — the spokes decision
   *  must ignore pairs behind floored/capped hubs, which never ship. */
  totalPairs: number;
  /** True when more floor-surviving hubs exist than the cap let through. */
  hubsTruncated: boolean;
  /** Hubs that survived the min-member floor, before the cap ("of N"). */
  totalHubs: number;
}

/** GET /api/graph/tags?tag={slug} — one hub's spokes, capped at
 *  GRAPH_TAG_SPOKE_CAP; hub.memberCount stays the TRUE count so the client
 *  can show "+N more" when the cap bit. */
export interface TagSpokesPayload {
  hub: TagLayerHub;
  edges: TagLayerEdge[];
}
