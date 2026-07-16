import { describe, expect, it } from "vitest";
import { buildGraphIndexes } from "../logic/indexes";
import { seedPositions } from "../logic/seeding";
import { edge, node, payload } from "./helpers";

// Two 3-person companies plus a floater with no edges at all.
const graph = payload(
  [
    node("a1", "contact"),
    node("a2", "contact"),
    node("a3", "contact"),
    node("b1", "contact"),
    node("b2", "contact"),
    node("b3", "contact"),
    node("floater", "contact"),
    node("acme", "company"),
    node("bcorp", "company"),
  ],
  [
    edge("w1", "a1", "acme", "works_at", "works_at"),
    edge("w2", "a2", "acme", "works_at", "works_at"),
    edge("w3", "a3", "acme", "works_at", "works_at"),
    edge("w4", "b1", "bcorp", "works_at", "works_at"),
    edge("w5", "b2", "bcorp", "works_at", "works_at"),
    edge("w6", "b3", "bcorp", "works_at", "works_at"),
  ],
);
const indexes = buildGraphIndexes(graph);

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("cluster-aware layout seeding", () => {
  it("is deterministic — cached positions stay comparable across visits", () => {
    const first = seedPositions(graph.nodes, graph.edges, indexes);
    const second = seedPositions(graph.nodes, graph.edges, indexes);
    for (const [id, pos] of first) {
      expect(second.get(id)).toEqual(pos);
    }
  });

  it("places every node — FA2 must never start from an undefined coordinate", () => {
    const positions = seedPositions(graph.nodes, graph.edges, indexes);
    expect(positions.size).toBe(graph.nodes.length);
    expect(positions.get("floater")).toBeDefined();
  });

  it("seeds coworkers closer to each other than to the other company's people", () => {
    // This pre-separation of communities is WHY FA2 converges inside the
    // iteration budget instead of untangling random scatter for seconds.
    const positions = seedPositions(graph.nodes, graph.edges, indexes);
    const within = dist(positions.get("a1")!, positions.get("a2")!);
    const across = dist(positions.get("a1")!, positions.get("b1")!);
    expect(within).toBeLessThan(across);
  });

  it("drops the company hub inside its members, not on the outer spiral", () => {
    const positions = seedPositions(graph.nodes, graph.edges, indexes);
    const members = ["a1", "a2", "a3"].map((id) => positions.get(id)!);
    const centroid = {
      x: members.reduce((sum, p) => sum + p.x, 0) / members.length,
      y: members.reduce((sum, p) => sum + p.y, 0) / members.length,
    };
    expect(dist(positions.get("acme")!, centroid)).toBeLessThan(10);
  });
});
