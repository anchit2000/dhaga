import { describe, expect, it } from "vitest";
import { convexHull, hullLabelAnchor, padHull } from "../logic/hull";

describe("group-circle hull geometry", () => {
  it("drops interior members — the outline hugs the boundary, not every node", () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 5 }, // interior
    ]);
    expect(hull).toHaveLength(4);
    expect(hull.some((p) => p.x === 5 && p.y === 5)).toBe(false);
  });

  it("pads outward so the circle breathes around member nodes instead of clipping them", () => {
    const square = convexHull([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);
    const padded = padHull(square, 2);
    for (const point of padded) {
      const fromCenter = Math.hypot(point.x - 5, point.y - 5);
      expect(fromCenter).toBeGreaterThan(Math.hypot(5, 5)); // beyond the corner radius
    }
  });

  it("still draws a ring for a lone member — a 1-node circle must be visible, not a dot", () => {
    const padded = padHull([{ x: 3, y: 3 }], 18);
    expect(padded.length).toBeGreaterThanOrEqual(8);
    for (const point of padded) {
      expect(Math.hypot(point.x - 3, point.y - 3)).toBeCloseTo(18, 5);
    }
  });

  it("anchors the label at the topmost point so it sits above the outline", () => {
    const anchor = hullLabelAnchor([
      { x: 0, y: 5 },
      { x: 4, y: -2 },
      { x: 8, y: 9 },
    ]);
    expect(anchor).toEqual({ x: 4, y: -2 });
  });
});
