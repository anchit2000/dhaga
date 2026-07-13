import { clusterPosition } from "./layout";
import {
  GRAPH_INITIAL_VIEW_RADIUS,
  GRAPH_VIEWPORT_MARGIN,
} from "@/utils/constants/graph";
import type { Cluster } from "@/lib/repo/graph-data";

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DirectionCounts {
  north: number;
  east: number;
  south: number;
  west: number;
}

export type DirectionTargets = Record<keyof DirectionCounts, { x: number; y: number } | null>;

export interface GraphViewportResult {
  visibleClusters: Cluster[];
  positions: Map<string, { x: number; y: number }>;
  directions: DirectionCounts;
  targets: DirectionTargets;
}

export const INITIAL_WORLD_BOUNDS: WorldBounds = {
  minX: -GRAPH_INITIAL_VIEW_RADIUS,
  maxX: GRAPH_INITIAL_VIEW_RADIUS,
  minY: -GRAPH_INITIAL_VIEW_RADIUS,
  maxY: GRAPH_INITIAL_VIEW_RADIUS,
};

export function worldBounds(
  viewport: { x: number; y: number; zoom: number },
  width: number,
  height: number,
): WorldBounds {
  return {
    minX: -viewport.x / viewport.zoom,
    maxX: (width - viewport.x) / viewport.zoom,
    minY: -viewport.y / viewport.zoom,
    maxY: (height - viewport.y) / viewport.zoom,
  };
}

export function graphViewport(clusters: Cluster[], bounds: WorldBounds): GraphViewportResult {
  const positions = new Map<string, { x: number; y: number }>();
  const visibleClusters: Cluster[] = [];
  const directions: DirectionCounts = { north: 0, east: 0, south: 0, west: 0 };
  const targets: DirectionTargets = { north: null, east: null, south: null, west: null };
  const targetDistances: Record<keyof DirectionCounts, number> = {
    north: Number.POSITIVE_INFINITY,
    east: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
  };
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  clusters.forEach((cluster, index) => {
    const position = clusterPosition(index);
    positions.set(cluster.key, position);
    const visible =
      position.x >= bounds.minX - GRAPH_VIEWPORT_MARGIN &&
      position.x <= bounds.maxX + GRAPH_VIEWPORT_MARGIN &&
      position.y >= bounds.minY - GRAPH_VIEWPORT_MARGIN &&
      position.y <= bounds.maxY + GRAPH_VIEWPORT_MARGIN;
    if (visible) {
      visibleClusters.push(cluster);
      return;
    }
    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "east" : "west")
      : (dy > 0 ? "south" : "north");
    directions[direction]++;
    const distance = Math.hypot(dx, dy);
    if (distance < targetDistances[direction]) {
      targetDistances[direction] = distance;
      targets[direction] = position;
    }
  });

  return { visibleClusters, positions, directions, targets };
}
