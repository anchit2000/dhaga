import {
  GRAPH_NODE_SIZE_MAX,
  GRAPH_NODE_SIZE_MIN,
} from "@/utils/constants/graph";
import type { FullGraphEdge, FullGraphNode, FullGraphPayload } from "../types";

/**
 * Structures derived ONCE per payload so hover/isolate/collapse reducers run
 * in O(1) per node — never rebuilt for a filter (perf contract: hover < 16ms
 * at 20k nodes).
 */
export interface GraphIndexes {
  nodeById: Map<string, FullGraphNode>;
  /** Undirected adjacency — who lights up around a hovered/isolated node. */
  neighbors: Map<string, Set<string>>;
  degree: Map<string, number>;
  /** Edges touching a node, for the side panel's in/out lists. */
  edgesByNode: Map<string, FullGraphEdge[]>;
  /** company/event id → member contact ids (via works_at / attended edges). */
  groupMembers: Map<string, Set<string>>;
}

export function buildGraphIndexes(payload: FullGraphPayload): GraphIndexes {
  const nodeById = new Map<string, FullGraphNode>();
  const neighbors = new Map<string, Set<string>>();
  const degree = new Map<string, number>();
  const edgesByNode = new Map<string, FullGraphEdge[]>();
  const groupMembers = new Map<string, Set<string>>();

  for (const node of payload.nodes) {
    nodeById.set(node.id, node);
    neighbors.set(node.id, new Set());
    degree.set(node.id, 0);
    edgesByNode.set(node.id, []);
  }

  for (const edge of payload.edges) {
    const src = nodeById.get(edge.source);
    const dst = nodeById.get(edge.target);
    if (!src || !dst) continue; // defensive: a dangling edge must not poison indexes
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    edgesByNode.get(edge.source)?.push(edge);
    edgesByNode.get(edge.target)?.push(edge);

    // Group membership drives collapse math: contacts belong to the
    // companies they work at and the events they attended.
    if (src.kind === "contact" && (dst.kind === "company" || dst.kind === "event")) {
      addMember(groupMembers, dst.id, src.id);
    } else if (dst.kind === "contact" && (src.kind === "company" || src.kind === "event")) {
      addMember(groupMembers, src.id, dst.id);
    }
  }

  return { nodeById, neighbors, degree, edgesByNode, groupMembers };
}

function addMember(map: Map<string, Set<string>>, groupId: string, contactId: string): void {
  const set = map.get(groupId);
  if (set) set.add(contactId);
  else map.set(groupId, new Set([contactId]));
}

/** sqrt(degree)-scaled node size, clamped — hubs read bigger without dwarfing the canvas. */
export function nodeSizeForDegree(deg: number): number {
  const size = GRAPH_NODE_SIZE_MIN + Math.sqrt(Math.max(deg, 0));
  return Math.min(GRAPH_NODE_SIZE_MAX, size);
}
