import {
  GRAPH_COLLAPSED_GROUP_SCALE,
} from "@/utils/constants/graph";
import type { NodeDisplayData } from "sigma/types";
import type { NodeRenderAttributes, RenderState } from "./types";

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
