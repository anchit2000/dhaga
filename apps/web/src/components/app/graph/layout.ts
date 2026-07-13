import type { Edge } from "@xyflow/react";
import {
  GRAPH_CLUSTER_SPACING,
  GRAPH_CONTACTS_PER_SHELL,
  GRAPH_LOCAL_RING_RADIUS,
  GRAPH_SHELL_SPACING,
} from "@/utils/constants/graph";
import type { Cluster, GraphViewEdge } from "@/lib/repo/graph-data";
import type { ClusterEntry } from "./graph-state";
import type { BrowserFlowNode } from "./nodes";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Deterministic point on a ring — shared by the cluster ring and each
 *  expanded cluster's local fan-out (same primitive, different center). */
export function ring(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/** Deterministic unbounded position; the largest clusters remain near home. */
export function clusterPosition(index: number): { x: number; y: number } {
  if (index === 0) return { x: 0, y: 0 };
  const radius = GRAPH_CLUSTER_SPACING * Math.sqrt(index);
  const angle = index * GOLDEN_ANGLE;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function edgeStyle(edge: GraphViewEdge, highlighted: boolean): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "straight",
    style: highlighted
      ? { stroke: "#e2a44c", strokeWidth: 2.5 }
      : { stroke: "#4a3d2b", strokeWidth: 1.5 },
    labelStyle: { fill: highlighted ? "#e2a44c" : "#a49a8a", fontSize: 10 },
    labelBgStyle: { fill: "#16120e", fillOpacity: 0.9 },
    zIndex: highlighted ? 1 : 0,
  };
}

/**
 * Companies/tags/locations sit on the outer ring (bounded by cluster count,
 * never contact count). An expanded cluster's contacts fan out locally
 * around its own (x, y) using the same ring() primitive, in shells of
 * increasing radius past CONTACTS_PER_SHELL. Edges only render once both
 * endpoints are currently loaded on the canvas.
 */
export function buildFlow(
  clusters: Cluster[],
  expanded: Set<string>,
  loaded: Map<string, ClusterEntry>,
  pending: Set<string>,
  positions?: Map<string, { x: number; y: number }>,
  focusedId?: string | null,
): { nodes: BrowserFlowNode[]; edges: Edge[] } {
  const nodes: BrowserFlowNode[] = [];
  const loadedNodeIds = new Set<string>(clusters.map((cluster) => cluster.key));
  const edgesById = new Map<string, GraphViewEdge>();

  clusters.forEach((cluster, index) => {
    const center = positions?.get(cluster.key) ?? clusterPosition(index);
    nodes.push({
      id: cluster.key,
      type: "company",
      position: center,
      style: { width: 1, height: 1 },
      data: {
        label: cluster.label,
        sublabel: null,
        href: null,
        contactCount: cluster.contactCount,
        expanded: expanded.has(cluster.key),
        pending: pending.has(cluster.key),
      },
    });

    if (!expanded.has(cluster.key)) return;
    const entry = loaded.get(cluster.key);
    if (!entry) return;

    let placed = 0;
    for (const contact of entry.contacts) {
      // Non-exclusive dimensions (tag) can hand back a contact another
      // expanded cluster already placed — first cluster to claim it wins.
      if (loadedNodeIds.has(contact.id)) continue;
      const shell = Math.floor(placed / GRAPH_CONTACTS_PER_SHELL);
      const shellIndex = placed % GRAPH_CONTACTS_PER_SHELL;
      const shellTotal = Math.min(
        GRAPH_CONTACTS_PER_SHELL,
        entry.contacts.length - shell * GRAPH_CONTACTS_PER_SHELL,
      );
      const local = ring(
        shellIndex,
        shellTotal,
        GRAPH_LOCAL_RING_RADIUS + shell * GRAPH_SHELL_SPACING,
      );
      nodes.push({
        id: contact.id,
        type: "person",
        position: { x: center.x + local.x, y: center.y + local.y },
        style: { width: 1, height: 1 },
        data: {
          label: contact.label,
          sublabel: contact.sublabel,
          href: `/app/people/${contact.id}`,
          highlighted: contact.id === focusedId,
        },
      });
      loadedNodeIds.add(contact.id);
      placed++;
    }

    if (entry.overflowCount > 0) {
      const shell = Math.floor(placed / GRAPH_CONTACTS_PER_SHELL);
      const shellIndex = placed % GRAPH_CONTACTS_PER_SHELL;
      const local = ring(
        shellIndex,
        GRAPH_CONTACTS_PER_SHELL,
        GRAPH_LOCAL_RING_RADIUS + shell * GRAPH_SHELL_SPACING,
      );
      nodes.push({
        id: `${cluster.key}__overflow`,
        type: "overflow",
        position: { x: center.x + local.x, y: center.y + local.y },
        style: { width: 1, height: 1 },
        data: { label: `+${entry.overflowCount} more — press ⌘K to search` },
      });
    }

    for (const edge of entry.edges) edgesById.set(edge.id, edge);
  });

  const edges = [...edgesById.values()]
    .filter((edge) => loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target))
    .map((edge) =>
      edgeStyle(edge, focusedId != null && (edge.source === focusedId || edge.target === focusedId)),
    );

  return { nodes, edges };
}
