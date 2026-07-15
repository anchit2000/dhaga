import { GRAPH_CLUSTER_SPACING } from "@/utils/constants/graph";

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
