import type { GraphIndexes } from "./indexes";
import type { FullGraphEdge, FullGraphNode, PositionMap } from "../types";

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Deterministic, cluster-aware seed positions. FA2 converges in far fewer
 * iterations from a seed that already separates communities than from random
 * scatter — this is what keeps 20k-node layout under the 15s budget.
 *
 * Contacts are grouped by primary company (first works_at edge); each group
 * gets a golden-spiral slot sized by member count, members fan out on an
 * inner golden spiral. Non-contact nodes start at the centroid of their
 * contact neighbours (or an outer spiral slot when unconnected). Same input
 * → same seed, so cached layouts stay comparable across visits.
 */
export function seedPositions(
  nodes: readonly FullGraphNode[],
  edges: readonly FullGraphEdge[],
  indexes: GraphIndexes,
): PositionMap {
  const positions: PositionMap = new Map();

  const primaryCompany = new Map<string, string>();
  for (const edge of edges) {
    if (edge.kind === "works_at" && !primaryCompany.has(edge.source)) {
      primaryCompany.set(edge.source, edge.target);
    }
  }

  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.kind !== "contact") continue;
    const key = primaryCompany.get(node.id) ?? "__ungrouped__";
    const members = groups.get(key);
    if (members) members.push(node.id);
    else groups.set(key, [node.id]);
  }

  // Big groups first → they claim the center, satellites ring them.
  const ordered = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  ordered.forEach(([, members], groupIndex) => {
    const groupRadius = Math.sqrt(members.length) * 12;
    const centerDistance = Math.sqrt(groupIndex + 0.5) * (groupRadius + 60) * 1.6;
    const centerAngle = groupIndex * GOLDEN_ANGLE;
    const cx = Math.cos(centerAngle) * centerDistance;
    const cy = Math.sin(centerAngle) * centerDistance;

    members.forEach((contactId, memberIndex) => {
      const r = Math.sqrt(memberIndex + 0.5) * (groupRadius / Math.sqrt(members.length + 1)) * 2;
      const angle = memberIndex * GOLDEN_ANGLE;
      positions.set(contactId, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    });
  });

  // Companies/events/tags/entities settle at their members' centroid so FA2
  // starts with hubs already inside their community.
  let outerIndex = 0;
  const outerBase = Math.sqrt(nodes.length + 1) * 40;
  for (const node of nodes) {
    if (positions.has(node.id)) continue;
    const centroid = neighborCentroid(node.id, indexes, positions);
    if (centroid) {
      positions.set(node.id, centroid);
    } else {
      const angle = outerIndex * GOLDEN_ANGLE;
      const r = outerBase + Math.sqrt(outerIndex + 1) * 30;
      positions.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      outerIndex += 1;
    }
  }

  return positions;
}

/** Mean position of already-placed neighbours; null when none are placed. */
export function neighborCentroid(
  nodeId: string,
  indexes: GraphIndexes,
  positions: PositionMap,
): { x: number; y: number } | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const neighborId of indexes.neighbors.get(nodeId) ?? []) {
    const pos = positions.get(neighborId);
    if (!pos) continue;
    sumX += pos.x;
    sumY += pos.y;
    count += 1;
  }
  if (count === 0) return null;
  // Tiny deterministic offset so co-located siblings don't stack exactly.
  const jitter = (hashCode(nodeId) % 100) / 50;
  return { x: sumX / count + jitter, y: sumY / count + jitter };
}

/** Deterministic 31-hash of an id — drives per-node jitter (here and in the
 *  lazy tag-layer merge) so co-located nodes never stack exactly. */
export function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
