import Graph from "graphology";
import Sigma from "sigma";
import { EdgeArrowProgram } from "sigma/rendering";
import {
  GRAPH_EDGE_EVENTS_MAX_EDGES,
  GRAPH_HIDE_EDGES_ON_MOVE_THRESHOLD,
  GRAPH_LABEL_SIZE_THRESHOLD,
} from "@/utils/constants/graph";
import { buildGraphIndexes, nodeSizeForDegree, type GraphIndexes } from "../logic/indexes";
import { buildRelationshipLabelMap, buildTypeColorMap, edgeLabel, fadeColor, nodeColor } from "../logic/style";
import { makeDrawNodeHover } from "./draw-hover";
import {
  makeEdgeReducer,
  makeNodeReducer,
  type EdgeRenderAttributes,
  type NodeRenderAttributes,
  type RenderState,
} from "./reducers";
import type { GraphTheme } from "./theme";
import type { FullGraphPayload, PositionMap } from "../types";

export type RenderGraph = Graph<NodeRenderAttributes, EdgeRenderAttributes>;
export type GraphRenderer = Sigma<NodeRenderAttributes, EdgeRenderAttributes>;

/** Static attributes written once; dynamic state stays in the reducers' ref. */
export function buildRenderGraph(
  payload: FullGraphPayload,
  positions: PositionMap,
  theme: GraphTheme,
  indexes: GraphIndexes = buildGraphIndexes(payload),
): RenderGraph {
  const graph: RenderGraph = new Graph({ multi: true, type: "directed" });
  const typeColors = buildTypeColorMap(payload.nodeTypes);
  const labelMap = buildRelationshipLabelMap(payload.relationshipTypes);

  for (const node of payload.nodes) {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const color = nodeColor(node, typeColors);
    graph.addNode(node.id, {
      x: pos.x,
      y: pos.y,
      label: node.label,
      size: nodeSizeForDegree(indexes.degree.get(node.id) ?? 0),
      color,
      dimColor: fadeColor(color, theme.ink, 0.82),
    });
  }
  for (const edge of payload.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
      label: edgeLabel(edge, labelMap),
      source: edge.source,
      target: edge.target,
      size: 1,
      color: theme.seam,
      dimColor: fadeColor(theme.seam, theme.ink, 0.6),
      activeColor: theme.amber,
    });
  }
  return graph;
}

/** Re-tint theme-dependent attributes in place when light/dark flips. */
export function applyThemeToGraph(graph: RenderGraph, theme: GraphTheme): void {
  graph.forEachNode((node, attrs) => {
    graph.setNodeAttribute(node, "dimColor", fadeColor(attrs.color, theme.ink, 0.82));
  });
  const seamDim = fadeColor(theme.seam, theme.ink, 0.6);
  graph.forEachEdge((edge) => {
    graph.mergeEdgeAttributes(edge, {
      color: theme.seam,
      dimColor: seamDim,
      activeColor: theme.amber,
    });
  });
}

export function createRenderer(
  container: HTMLElement,
  graph: RenderGraph,
  theme: GraphTheme,
  renderStateRef: { current: RenderState },
): GraphRenderer {
  return new Sigma<NodeRenderAttributes, EdgeRenderAttributes>(graph, container, {
    defaultEdgeType: "arrow",
    edgeProgramClasses: { arrow: EdgeArrowProgram },
    renderEdgeLabels: true,
    hideEdgesOnMove: graph.order > GRAPH_HIDE_EDGES_ON_MOVE_THRESHOLD,
    enableEdgeEvents: graph.size <= GRAPH_EDGE_EVENTS_MAX_EDGES,
    zIndex: true,
    stagePadding: 40,
    minCameraRatio: 0.005,
    maxCameraRatio: 2,
    labelSize: 11,
    labelFont: theme.monoFont,
    labelColor: { color: theme.paper },
    labelRenderedSizeThreshold: GRAPH_LABEL_SIZE_THRESHOLD,
    edgeLabelSize: 9,
    edgeLabelFont: theme.monoFont,
    edgeLabelColor: { color: theme.fog },
    defaultDrawNodeHover: makeDrawNodeHover(theme),
    nodeReducer: makeNodeReducer(renderStateRef),
    edgeReducer: makeEdgeReducer(renderStateRef),
  });
}

/** Sigma label settings that change with the theme, applied to a live renderer. */
export function applyThemeToRenderer(renderer: GraphRenderer, theme: GraphTheme): void {
  renderer.setSetting("labelColor", { color: theme.paper });
  renderer.setSetting("edgeLabelColor", { color: theme.fog });
  renderer.setSetting("labelFont", theme.monoFont);
  renderer.setSetting("edgeLabelFont", theme.monoFont);
  renderer.setSetting("defaultDrawNodeHover", makeDrawNodeHover(theme));
}
