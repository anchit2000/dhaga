"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { convexHull, hullLabelAnchor, padHull, type Point } from "../logic/hull";
import { resolveGraphTheme } from "./theme";
import type { GraphIndexes } from "../logic/indexes";
import type { GraphRenderer } from "./create-sigma";

interface CircleShape {
  label: string;
  hull: Point[];
  anchor: Point;
}

/**
 * Group circles ("Circles form themselves" — landing mock): labeled hull
 * outlines around an event's or tag's member contacts, drawn on a canvas
 * BELOW sigma's layers and re-projected from cached graph-space geometry on
 * every sigma render, so pan/zoom stays cheap even with circles on.
 */
export function CirclesUnderlay({
  renderer,
  indexes,
  circleIds,
  hiddenNodes,
}: {
  renderer: GraphRenderer;
  indexes: GraphIndexes;
  circleIds: ReadonlySet<string>;
  hiddenNodes: ReadonlySet<string>;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  // Hull geometry in graph coordinates — recomputed only when membership or
  // positions could have changed, never per frame.
  const shapes = useMemo<CircleShape[]>(() => {
    const graph = renderer.getGraph();
    const result: CircleShape[] = [];
    for (const circleId of circleIds) {
      const node = indexes.nodeById.get(circleId);
      if (!node) continue;
      const points: Point[] = [];
      for (const memberId of indexes.neighbors.get(circleId) ?? []) {
        const member = indexes.nodeById.get(memberId);
        if (!member || member.kind !== "contact" || hiddenNodes.has(memberId)) continue;
        points.push({
          x: graph.getNodeAttribute(memberId, "x") as number,
          y: graph.getNodeAttribute(memberId, "y") as number,
        });
      }
      if (points.length === 0) continue;
      const hull = padHull(convexHull(points), 18);
      const anchor = hullLabelAnchor(hull);
      if (!anchor) continue;
      result.push({ label: node.label, hull, anchor });
    }
    return result;
  }, [renderer, indexes, circleIds, hiddenNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = renderer.getContainer();
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const theme = resolveGraphTheme(container);

    const draw = (): void => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = container.getBoundingClientRect();
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      for (const shape of shapes) {
        const projected = shape.hull.map((p) => renderer.graphToViewport(p));
        drawSmoothPath(context, projected);
        context.fillStyle = withAlpha(theme.amber, 0.05);
        context.fill();
        context.strokeStyle = withAlpha(theme.amber, 0.55);
        context.lineWidth = 1;
        context.setLineDash([5, 4]);
        context.stroke();
        context.setLineDash([]);

        const anchor = renderer.graphToViewport(shape.anchor);
        context.font = `600 10px ${theme.monoFont}`;
        context.textAlign = "center";
        context.fillStyle = theme.ember;
        context.fillText(
          `${shape.label.toUpperCase()} — AUTO-GROUPED`,
          anchor.x,
          anchor.y - 10,
        );
      }
    };

    draw();
    renderer.on("afterRender", draw);
    return () => {
      renderer.off("afterRender", draw);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [renderer, shapes, resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

/** Closed path through midpoints with quadratic corners — the "rounded" hull. */
function drawSmoothPath(context: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 3) {
    if (points.length === 0) return;
    context.beginPath();
    context.arc(points[0].x, points[0].y, 24, 0, Math.PI * 2);
    return;
  }
  context.beginPath();
  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(points[points.length - 1], points[0]);
  context.moveTo(start.x, start.y);
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const to = mid(current, next);
    context.quadraticCurveTo(current.x, current.y, to.x, to.y);
  }
  context.closePath();
}

function withAlpha(hex: string, alpha: number): string {
  const channel = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return hex.length === 7 ? `${hex}${channel}` : hex;
}
