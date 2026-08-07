import type { Attributes } from "graphology-types";
import type { GraphNodeKind } from "../../types";

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
  /** Palette slot `color` came from, so a theme flip can re-resolve it in
   *  place; undefined when the fill is a user-chosen node-type colour. */
  paletteKey?: GraphNodeKind;
}

export interface EdgeRenderAttributes extends Attributes {
  label: string;
  source: string;
  target: string;
  color: string;
  dimColor: string;
  activeColor: string;
  /** Softer, desaturated amber for edges *incoming* to the hovered node.
   *  Optional: tag-layer spoke edges omit it and fall back to activeColor. */
  incomingColor?: string;
}
