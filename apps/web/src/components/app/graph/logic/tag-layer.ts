import { GRAPH_NODE_COLORS } from "@/utils/constants/graph";
import { nodeSizeForDegree } from "./indexes";
import { hashCode } from "./seeding";
import { edgeLabel, fadeColor } from "./style";
import type Graph from "graphology";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "./indexes";
import type { EdgeRenderAttributes, NodeRenderAttributes } from "../canvas/reducers";
import type { GraphTheme } from "../canvas/theme";
import type { FullGraphEdge, FullGraphNode, PositionMap, TagLayerPayload } from "../types";

export type TagRenderGraph = Graph<NodeRenderAttributes, EdgeRenderAttributes>;

/** The client-shaped nodes/edges actually merged — appended to the payload views. */
export interface MergedTagLayer {
  nodes: FullGraphNode[];
  edges: FullGraphEdge[];
}

/**
 * Merge a tag-layer payload (the initial fetch OR one tag's spokes) into the
 * LIVE render graph — never a rebuild, never a re-layout. Each hub lands at
 * the centroid of its member contacts' settled positions (plus a small
 * deterministic jitter so tags with identical membership don't stack
 * exactly), sized by its aggregate memberCount on the same sqrt scale as
 * degree — a truncated hub reads at its true weight before any spoke loads.
 * `indexes` is extended in place so visibility, collapse, hover and the node
 * panel all see the late nodes; the caller re-wraps its identity to retrigger
 * memos. Idempotent: hubs/edges already in the graph are skipped, so a
 * StrictMode re-run or a repeated per-tag load merges nothing twice.
 */
export function mergeTagLayer(
  layer: Pick<TagLayerPayload, "hubs" | "edges">,
  indexes: GraphIndexes,
  graph: TagRenderGraph,
  positions: PositionMap,
  labelMap: RelationshipLabelMap,
  theme: Pick<GraphTheme, "ink" | "seam" | "amber">,
): MergedTagLayer {
  const merged: MergedTagLayer = { nodes: [], edges: [] };

  // Membership first: centroid and size both need it, and an edge whose
  // contact vanished since the fetch must not dangle into the renderer.
  const membersByHub = new Map<string, string[]>();
  const liveEdges: TagLayerPayload["edges"] = [];
  for (const tagEdge of layer.edges) {
    if (!indexes.nodeById.has(tagEdge.source) || graph.hasEdge(tagEdge.id)) continue;
    liveEdges.push(tagEdge);
    const members = membersByHub.get(tagEdge.target);
    if (members) members.push(tagEdge.source);
    else membersByHub.set(tagEdge.target, [tagEdge.source]);
  }

  const tagColor = GRAPH_NODE_COLORS.tag;
  const tagDim = fadeColor(tagColor, theme.ink, 0.82);
  for (const hub of layer.hubs) {
    const members = membersByHub.get(hub.id) ?? [];
    if (graph.hasNode(hub.id)) {
      // A truncated hub merged without spokes sits at its origin jitter; its
      // first per-tag load gives it a real home — re-centre on the members'
      // centroid before the edges land (nothing is anchored to it yet).
      if (members.length > 0 && (indexes.degree.get(hub.id) ?? 0) === 0) {
        const pos = hubPosition(hub.id, members, positions);
        graph.setNodeAttribute(hub.id, "x", pos.x);
        graph.setNodeAttribute(hub.id, "y", pos.y);
      }
      continue;
    }
    const pos = hubPosition(hub.id, members, positions);
    graph.addNode(hub.id, {
      x: pos.x,
      y: pos.y,
      label: hub.label,
      size: nodeSizeForDegree(hub.memberCount),
      color: tagColor,
      dimColor: tagDim,
    });
    const node: FullGraphNode = {
      id: hub.id,
      kind: "tag",
      label: hub.label,
      sublabel: null,
      memberCount: hub.memberCount,
    };
    merged.nodes.push(node);
    indexes.nodeById.set(hub.id, node);
    indexes.neighbors.set(hub.id, new Set());
    indexes.degree.set(hub.id, 0);
    indexes.edgesByNode.set(hub.id, []);
  }

  const seamDim = fadeColor(theme.seam, theme.ink, 0.6);
  for (const tagEdge of liveEdges) {
    if (!graph.hasNode(tagEdge.target)) continue; // hub missing from a malformed payload
    const edge: FullGraphEdge = {
      id: tagEdge.id,
      source: tagEdge.source,
      target: tagEdge.target,
      predicate: "tagged",
      kind: "tagged",
    };
    graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
      label: edgeLabel(edge, labelMap),
      source: edge.source,
      target: edge.target,
      size: 1,
      color: theme.seam,
      dimColor: seamDim,
      activeColor: theme.amber,
    });
    merged.edges.push(edge);
    indexes.neighbors.get(edge.source)?.add(edge.target);
    indexes.neighbors.get(edge.target)?.add(edge.source);
    indexes.degree.set(edge.source, (indexes.degree.get(edge.source) ?? 0) + 1);
    indexes.degree.set(edge.target, (indexes.degree.get(edge.target) ?? 0) + 1);
    indexes.edgesByNode.get(edge.source)?.push(edge);
    indexes.edgesByNode.get(edge.target)?.push(edge);
  }
  return merged;
}

/** Centroid of the members' settled positions, plus a deterministic ±2-unit
 *  per-hub jitter — the same offset every visit, so layouts stay comparable. */
function hubPosition(
  hubId: string,
  members: readonly string[],
  positions: PositionMap,
): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const memberId of members) {
    const pos = positions.get(memberId);
    if (!pos) continue;
    sumX += pos.x;
    sumY += pos.y;
    count += 1;
  }
  const hash = hashCode(hubId);
  const jitterX = ((hash % 100) - 50) / 25;
  const jitterY = (((hash >> 7) % 100) - 50) / 25;
  if (count === 0) return { x: jitterX, y: jitterY };
  return { x: sumX / count + jitterX, y: sumY / count + jitterY };
}
