import { Figure } from "@/components/blog/visuals/Figure";
import type { CSSProperties, ReactElement } from "react";

type NodeKind = "you" | "contact" | "target" | "mutual";

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: NodeKind;
}

interface GraphEdge {
  from: string;
  to: string;
  strong?: boolean;
}

interface NodeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  caption?: string;
  height?: number;
}

// Radius + fill/stroke per node kind. Coordinates and radii are in the 640-wide
// viewBox user space, so the whole graph scales with the container. Solid fills
// stay amber; thin strokes use ember, because amber is only ~2:1 on the light
// panel and a target node is nothing but its ring.
const KIND_STYLE: Record<NodeKind, { r: number; fill: string; stroke: string; strokeWidth: number }> = {
  you: { r: 22, fill: "var(--color-amber)", stroke: "var(--color-amber)", strokeWidth: 0 },
  target: { r: 16, fill: "var(--color-ink)", stroke: "var(--color-ember)", strokeWidth: 2.5 },
  mutual: { r: 10, fill: "var(--color-panel-2)", stroke: "var(--color-seam)", strokeWidth: 1.5 },
  contact: { r: 14, fill: "var(--color-panel-2)", stroke: "var(--color-seam)", strokeWidth: 1.5 },
};

// A relationship map rendered as inline, scalable SVG: you → mutuals → targets.
// Edges draw first so nodes sit on top; strong edges glow ember and thicker.
export function NodeGraph({
  nodes,
  edges,
  caption,
  height = 380,
}: NodeGraphProps): ReactElement {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const label = caption ?? "Relationship graph";

  return (
    <Figure caption={caption}>
      <svg
        viewBox={`0 0 640 ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {edges.map((edge, index) => {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) return null;
          const style: CSSProperties = {
            stroke: edge.strong ? "var(--color-ember)" : "var(--color-seam)",
          };
          return (
            <line
              key={`e-${index}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={edge.strong ? 2.5 : 1.5}
              strokeLinecap="round"
              style={style}
            />
          );
        })}
        {nodes.map((node) => {
          const kind = KIND_STYLE[node.kind ?? "contact"];
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={kind.r}
                strokeWidth={kind.strokeWidth}
                style={{ fill: kind.fill, stroke: kind.stroke }}
              />
              <text
                x={node.x}
                y={node.y + kind.r + 16}
                textAnchor="middle"
                fontSize={13}
                className="font-mono"
                style={{ fill: "var(--color-paper)" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Figure>
  );
}
