import type { Cluster, ClusterDimension, GraphViewEdge, GraphViewNode } from "@/lib/repo/graph-data";

export interface ClusterEntry {
  contacts: GraphViewNode[];
  edges: GraphViewEdge[];
  overflowCount: number;
}

/** A deep-linked contact's direct relationships, overlaid on top of the
 *  cluster view so the interpersonal edges draw across company clusters. */
export interface FocusRelationships {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

export interface GraphState {
  dimension: ClusterDimension;
  clusters: Cluster[];
  clustersLoading: boolean;
  expanded: Set<string>;
  loaded: Map<string, ClusterEntry>;
  pending: Set<string>;
  focusRelationships: FocusRelationships | null;
}

export type GraphAction =
  | { type: "dimension-start"; dimension: ClusterDimension }
  | { type: "dimension-success"; dimension: ClusterDimension; clusters: Cluster[] }
  | { type: "expand-start"; key: string }
  | { type: "expand-success"; key: string; entry: ClusterEntry }
  | { type: "expand-error"; key: string }
  | { type: "collapse"; key: string }
  | { type: "focus-relationships"; relationships: FocusRelationships };

export function initialGraphState(clusters: Cluster[]): GraphState {
  return {
    dimension: "company",
    clusters,
    clustersLoading: false,
    expanded: new Set(),
    loaded: new Map(),
    pending: new Set(),
    focusRelationships: null,
  };
}

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case "dimension-start":
      return {
        ...state,
        dimension: action.dimension,
        clustersLoading: true,
        expanded: new Set(),
        pending: new Set(),
        focusRelationships: null,
      };
    case "focus-relationships":
      return { ...state, focusRelationships: action.relationships };
    case "dimension-success":
      // A stale response from a dimension the user has since switched away from.
      if (action.dimension !== state.dimension) return state;
      return { ...state, clusters: action.clusters, clustersLoading: false };
    case "expand-start":
      return { ...state, pending: new Set(state.pending).add(action.key) };
    case "expand-success": {
      const pending = new Set(state.pending);
      pending.delete(action.key);
      const loaded = new Map(state.loaded);
      loaded.set(action.key, action.entry);
      return { ...state, pending, loaded, expanded: new Set(state.expanded).add(action.key) };
    }
    case "expand-error": {
      const pending = new Set(state.pending);
      pending.delete(action.key);
      return { ...state, pending };
    }
    case "collapse": {
      const expanded = new Set(state.expanded);
      expanded.delete(action.key);
      return { ...state, expanded };
    }
    default:
      return state;
  }
}
