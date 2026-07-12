import type { Edge } from "@xyflow/react";
import type { Cluster, GraphViewEdge } from "@/lib/repo/graph-data";
import type { ClusterEntry } from "./graph-state";
import type { BrowserFlowNode } from "./nodes";

const CLUSTER_RING_RADIUS = 170;
const LOCAL_RING_RADIUS = 90;
const CONTACTS_PER_SHELL = 14;
const SHELL_SPACING = 70;

/** Deterministic point on a ring — shared by the cluster ring and each
 *  expanded cluster's local fan-out (same primitive, different center). */
export function ring(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function edgeStyle(edge: GraphViewEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "straight",
    style: { stroke: "#4a3d2b", strokeWidth: 1.5 },
    labelStyle: { fill: "#a49a8a", fontSize: 10 },
    labelBgStyle: { fill: "#16120e", fillOpacity: 0.9 },
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
): { nodes: BrowserFlowNode[]; edges: Edge[] } {
  const nodes: BrowserFlowNode[] = [];
  const loadedNodeIds = new Set<string>(clusters.map((cluster) => cluster.key));
  const edgesById = new Map<string, GraphViewEdge>();

  clusters.forEach((cluster, index) => {
    const center = ring(index, clusters.length, clusters.length > 1 ? CLUSTER_RING_RADIUS : 0);
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
      const shell = Math.floor(placed / CONTACTS_PER_SHELL);
      const shellIndex = placed % CONTACTS_PER_SHELL;
      const shellTotal = Math.min(CONTACTS_PER_SHELL, entry.contacts.length - shell * CONTACTS_PER_SHELL);
      const local = ring(shellIndex, shellTotal, LOCAL_RING_RADIUS + shell * SHELL_SPACING);
      nodes.push({
        id: contact.id,
        type: "person",
        position: { x: center.x + local.x, y: center.y + local.y },
        style: { width: 1, height: 1 },
        data: { label: contact.label, sublabel: contact.sublabel, href: `/app/people/${contact.id}` },
      });
      loadedNodeIds.add(contact.id);
      placed++;
    }

    if (entry.overflowCount > 0) {
      const shell = Math.floor(placed / CONTACTS_PER_SHELL);
      const shellIndex = placed % CONTACTS_PER_SHELL;
      const local = ring(shellIndex, CONTACTS_PER_SHELL, LOCAL_RING_RADIUS + shell * SHELL_SPACING);
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
    .map(edgeStyle);

  return { nodes, edges };
}
