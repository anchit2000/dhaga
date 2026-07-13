import { describe, expect, it } from "vitest";
import { graphViewport, INITIAL_WORLD_BOUNDS, worldBounds } from "./viewport";
import type { Cluster } from "@/lib/repo/graph-data";

describe("graph viewport virtualization", () => {
  it("keeps the active graph bounded and accounts for every unloaded cluster", () => {
    const clusters: Cluster[] = Array.from({ length: 1_000 }, (_, index) => ({
      key: `company-${index}`,
      label: `Company ${index}`,
      contactCount: index + 1,
    }));

    const result = graphViewport(clusters, INITIAL_WORLD_BOUNDS);
    const unloaded = Object.values(result.directions).reduce((sum, count) => sum + count, 0);

    expect(result.visibleClusters.length).toBeLessThan(50);
    expect(result.visibleClusters.length + unloaded).toBe(clusters.length);
    for (const direction of ["north", "east", "south", "west"] as const) {
      expect(result.directions[direction] === 0).toBe(result.targets[direction] === null);
    }
  });

  it("translates the React Flow viewport into world coordinates", () => {
    expect(worldBounds({ x: -100, y: -50, zoom: 2 }, 1_000, 600)).toEqual({
      minX: 50,
      maxX: 550,
      minY: 25,
      maxY: 325,
    });
  });

  it("targets the nearest off-screen cluster in each advertised direction", () => {
    const clusters: Cluster[] = Array.from({ length: 100 }, (_, index) => ({
      key: `company-${index}`,
      label: `Company ${index}`,
      contactCount: 1,
    }));
    const result = graphViewport(clusters, {
      minX: -100,
      maxX: 100,
      minY: -100,
      maxY: 100,
    });

    for (const direction of ["north", "east", "south", "west"] as const) {
      expect(result.directions[direction]).toBeGreaterThan(0);
      expect(result.targets[direction]).not.toBeNull();
    }
  });
});
