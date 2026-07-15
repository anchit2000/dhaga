import type { Edge } from "@xyflow/react";
import {
  GRAPH_CONTACTS_PER_SHELL,
  GRAPH_LOCAL_RING_RADIUS,
  GRAPH_RELATION_RING_RADIUS,
  GRAPH_SHELL_SPACING,
} from "@/utils/constants/graph";
import type { GraphViewEdge } from "@/lib/repo/graph-data";
import type { Cluster } from "@/lib/repo/graph-data";
import type { ClusterEntry, FocusRelationships } from "../graph-state";
import type { BrowserFlowNode } from "../nodes";
import { clusterPosition, ring } from "./positions";

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
  focusRelationships?: FocusRelationships | null,
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

  // Overlay a focused contact's interpersonal relationships: fan any neighbour
  // not already on the canvas around the focused node, then add the edges — so
  // "Ajay --parent of--> Anchit" draws even though they sit in different
  // company clusters. Needs the focused node placed first (its cluster expanded
  // by the focus kickoff), hence this runs after the cluster loop.
  if (focusRelationships && focusedId != null) {
    const focusedNode = nodes.find((node) => node.id === focusedId);
    if (focusedNode) {
      const center = focusedNode.position;
      const missing = focusRelationships.nodes.filter((node) => !loadedNodeIds.has(node.id));
      missing.forEach((neighbour, index) => {
        const local = ring(index, missing.length, GRAPH_RELATION_RING_RADIUS);
        nodes.push({
          id: neighbour.id,
          type: "person",
          position: { x: center.x + local.x, y: center.y + local.y },
          style: { width: 1, height: 1 },
          data: {
            label: neighbour.label,
            sublabel: neighbour.sublabel,
            href: `/app/people/${neighbour.id}`,
            highlighted: false,
          },
        });
        loadedNodeIds.add(neighbour.id);
      });
      for (const edge of focusRelationships.edges) edgesById.set(edge.id, edge);
    }
  }

  const edges = [...edgesById.values()]
    .filter((edge) => loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target))
    .map((edge) =>
      edgeStyle(edge, focusedId != null && (edge.source === focusedId || edge.target === focusedId)),
    );

  return { nodes, edges };
}
