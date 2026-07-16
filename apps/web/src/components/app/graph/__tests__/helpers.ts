import Graph from "graphology";
import { buildGraphIndexes, type GraphIndexes } from "../logic/indexes";
import type { TagRenderGraph } from "../logic/tag-layer";
import type { FullGraphEdge, FullGraphNode, FullGraphPayload, PositionMap } from "../types";

export function node(
  id: string,
  kind: FullGraphNode["kind"],
  extra?: Partial<FullGraphNode>,
): FullGraphNode {
  return { id, kind, label: id, sublabel: null, ...extra };
}

export function edge(
  id: string,
  source: string,
  target: string,
  kind: FullGraphEdge["kind"] = "explicit",
  predicate = "knows",
): FullGraphEdge {
  return { id, source, target, predicate, kind };
}

export function payload(
  nodes: FullGraphNode[],
  edges: FullGraphEdge[],
): FullGraphPayload {
  return { nodes, edges, nodeTypes: [], relationshipTypes: [] };
}

/** A settled render graph for tag-merge tests: payload nodes placed at fixed
 *  coordinates, indexes built — the state mergeTagLayer joins into. */
export function settledGraph(
  base: FullGraphPayload,
  coords: Record<string, { x: number; y: number }>,
): { indexes: GraphIndexes; graph: TagRenderGraph; positions: PositionMap } {
  const indexes = buildGraphIndexes(base);
  const positions: PositionMap = new Map(Object.entries(coords));
  const graph: TagRenderGraph = new Graph({ multi: true, type: "directed" });
  for (const item of base.nodes) {
    const pos = positions.get(item.id) ?? { x: 0, y: 0 };
    graph.addNode(item.id, {
      x: pos.x,
      y: pos.y,
      label: item.label,
      size: 3,
      color: "#ffffff",
      dimColor: "#000000",
    });
  }
  return { indexes, graph, positions };
}
