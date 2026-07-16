export interface Point {
  x: number;
  y: number;
}

/**
 * Convex hull (Andrew's monotone chain), returned counter-clockwise.
 * Degenerate inputs (0-2 points) return what they can — the caller pads, so
 * even a single-member circle still draws as a ring around that node.
 */
export function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= 2) return sorted;

  const cross = (o: Point, a: Point, b: Point): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/**
 * Pad a hull outward from its centroid so the outline breathes around member
 * nodes instead of clipping through them. Padding scales with hull size and
 * never drops below `minPad` (keeps 1-2 member circles visible).
 */
export function padHull(hull: readonly Point[], minPad: number): Point[] {
  if (hull.length === 0) return [];
  const cx = hull.reduce((sum, p) => sum + p.x, 0) / hull.length;
  const cy = hull.reduce((sum, p) => sum + p.y, 0) / hull.length;

  if (hull.length === 1) {
    // Ring of 8 points around a lone member.
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      return { x: cx + Math.cos(angle) * minPad, y: cy + Math.sin(angle) * minPad };
    });
  }

  let maxDist = 0;
  for (const p of hull) {
    maxDist = Math.max(maxDist, Math.hypot(p.x - cx, p.y - cy));
  }
  const pad = Math.max(minPad, maxDist * 0.15);

  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const scale = (dist + pad) / dist;
    return { x: cx + dx * scale, y: cy + dy * scale };
  });
}

/** Topmost point (smallest y) — where the circle's label anchors. */
export function hullLabelAnchor(hull: readonly Point[]): Point | null {
  if (hull.length === 0) return null;
  let top = hull[0];
  for (const p of hull) {
    if (p.y < top.y) top = p;
  }
  return top;
}
