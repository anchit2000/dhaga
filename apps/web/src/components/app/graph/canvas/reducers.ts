import { GRAPH_COLLAPSED_GROUP_SCALE } from "@/utils/constants/graph";
import type { Attributes } from "graphology-types";
import type { EdgeDisplayData, NodeDisplayData } from "sigma/types";

/**
 * Everything the reducers read per refresh, held in a mutable ref so hover
 * and filter changes are a set-swap + `sigma.refresh({ skipIndexation: true })`
 * — never a reducer re-bind, never a graph rebuild (perf contract).
 */
export interface RenderState {
  hiddenNodes: ReadonlySet<string>;
  hoveredId: string | null;
  hoveredNeighbors: ReadonlySet<string> | null;
  selectedId: string | null;
  highlightedPath: ReadonlySet<string> | null;
  /** collapsed group id → swallowed member count (drives the badge + scale). */
  collapsedCounts: ReadonlyMap<string, number>;
  /** True when zoomed past the edge-label threshold. */
  edgeLabelsVisible: boolean;
}

export function emptyRenderState(): RenderState {
  return {
    hiddenNodes: new Set(),
    hoveredId: null,
    hoveredNeighbors: null,
    selectedId: null,
    highlightedPath: null,
    collapsedCounts: new Map(),
    edgeLabelsVisible: false,
  };
}

/** Node attrs written once at graph build / theme change; reducers only read. */
export interface NodeRenderAttributes extends Attributes {
  label: string;
  size: number;
  color: string;
  dimColor: string;
}

export interface EdgeRenderAttributes extends Attributes {
  label: string;
  source: string;
  target: string;
  color: string;
  dimColor: string;
  activeColor: string;
}

// Sigma's reducer contract (sigma@3 internal/Sigma.addNode): the returned
// object REPLACES the node's attributes wholesale — "this function must return
// a total object and won't be merged". Every return path must spread `data`
// first, or x/y/size/color are wiped and applyNodeDefaults throws.
export function makeNodeReducer(ref: { current: RenderState }) {
  return (node: string, data: NodeRenderAttributes): Partial<NodeDisplayData> => {
    const state = ref.current;
    if (state.hiddenNodes.has(node)) return { ...data, hidden: true };

    const out: Partial<NodeDisplayData> = { ...data };
    const collapsedCount = state.collapsedCounts.get(node);
    if (collapsedCount !== undefined) {
      out.size = data.size * GRAPH_COLLAPSED_GROUP_SCALE;
      out.label = `${data.label} · ${collapsedCount}`;
    }

    if (node === state.selectedId) {
      out.highlighted = true;
      out.forceLabel = true;
      out.zIndex = 3;
      return out;
    }
    if (state.hoveredId) {
      if (node === state.hoveredId) {
        out.forceLabel = true;
        out.zIndex = 3;
      } else if (!state.hoveredNeighbors?.has(node)) {
        out.color = data.dimColor;
        out.label = null;
        out.zIndex = 0;
      }
      return out;
    }
    if (state.highlightedPath) {
      if (state.highlightedPath.has(node)) {
        out.forceLabel = true;
        out.zIndex = 2;
      } else {
        out.color = data.dimColor;
        out.label = null;
        out.zIndex = 0;
      }
    }
    return out;
  };
}

// Same total-object contract as the node reducer: spread `data` on every path.
export function makeEdgeReducer(ref: { current: RenderState }) {
  return (_edge: string, data: EdgeRenderAttributes): Partial<EdgeDisplayData> => {
    const state = ref.current;
    if (state.hiddenNodes.has(data.source) || state.hiddenNodes.has(data.target)) {
      return { ...data, hidden: true };
    }

    const touchesSelected =
      state.selectedId !== null &&
      (data.source === state.selectedId || data.target === state.selectedId);
    const touchesHovered =
      state.hoveredId !== null &&
      (data.source === state.hoveredId || data.target === state.hoveredId);
    const onPath =
      state.highlightedPath !== null &&
      state.highlightedPath.has(data.source) &&
      state.highlightedPath.has(data.target);

    // Hovered/selected edges always carry their label — the primary way to
    // read a relationship without opening the panel.
    if (touchesSelected || touchesHovered || onPath) {
      return { ...data, color: data.activeColor, label: data.label, forceLabel: true, zIndex: 1, size: 1.6 };
    }
    if (state.hoveredId || state.highlightedPath) {
      return { ...data, color: data.dimColor, label: null };
    }
    return { ...data, label: state.edgeLabelsVisible ? data.label : null };
  };
}
