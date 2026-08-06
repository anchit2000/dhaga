import {
  GRAPH_EDGE_ACTIVE_SIZE,
  GRAPH_EDGE_INCOMING_SIZE,
} from "@/utils/constants/graph";
import type { EdgeDisplayData } from "sigma/types";
import type { EdgeRenderAttributes, RenderState } from "./types";

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
    // read a relationship without opening the panel. On hover, direction is
    // emphasised: an edge whose SOURCE is the hovered node (outgoing — the
    // hovered node is the subject) gets the strongest treatment (full amber,
    // thickest, so the arrowhead is unmistakable), while an edge merely
    // pointing INTO the hovered node (incoming) reads softer — a desaturated
    // amber a notch thinner. Selected/path edges keep the strong treatment.
    if (touchesSelected || touchesHovered || onPath) {
      const incoming =
        !touchesSelected &&
        !onPath &&
        data.target === state.hoveredId &&
        data.source !== state.hoveredId;
      return {
        ...data,
        color: incoming ? data.incomingColor ?? data.activeColor : data.activeColor,
        label: data.label,
        forceLabel: true,
        zIndex: 1,
        size: incoming ? GRAPH_EDGE_INCOMING_SIZE : GRAPH_EDGE_ACTIVE_SIZE,
      };
    }
    if (state.hoveredId || state.highlightedPath) {
      return { ...data, color: data.dimColor, label: null };
    }
    return { ...data, label: state.edgeLabelsVisible ? data.label : null };
  };
}
