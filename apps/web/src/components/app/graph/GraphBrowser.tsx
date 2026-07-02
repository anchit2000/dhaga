"use client";

import { useMemo } from "react";
import { Background, ReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CompanyGraphNode,
  PersonGraphNode,
  type BrowserFlowNode,
} from "./nodes";
import type { GraphViewData } from "@/lib/repo/graph-data";

const nodeTypes = { person: PersonGraphNode, company: CompanyGraphNode };

/** Deterministic layout: companies on an inner ring, people on an outer ring. */
function layoutNodes(data: GraphViewData): BrowserFlowNode[] {
  const people = data.nodes.filter((node) => node.kind === "contact");
  const orgs = data.nodes.filter((node) => node.kind === "company");
  const ring = (index: number, total: number, radius: number) => {
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  };
  return [
    ...orgs.map((node, index) => ({
      id: node.id,
      type: "company" as const,
      position: ring(index, orgs.length, orgs.length > 1 ? 170 : 0),
      style: { width: 1, height: 1 },
      data: { label: node.label, sublabel: node.sublabel, href: null },
    })),
    ...people.map((node, index) => ({
      id: node.id,
      type: "person" as const,
      position: ring(index, people.length, 340),
      style: { width: 1, height: 1 },
      data: {
        label: node.label,
        sublabel: node.sublabel,
        href: `/app/people/${node.id}`,
      },
    })),
  ];
}

export function GraphBrowser({ data }: { data: GraphViewData }) {
  const nodes = useMemo(() => layoutNodes(data), [data]);
  const edges = useMemo<Edge[]>(
    () =>
      data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: "straight",
        style: { stroke: "#4a3d2b", strokeWidth: 1.5 },
        labelStyle: { fill: "#a49a8a", fontSize: 10 },
        labelBgStyle: { fill: "#16120e", fillOpacity: 0.9 },
      })),
    [data],
  );

  return (
    <div className="h-[70vh] overflow-hidden rounded-2xl border border-seam bg-panel/40">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        deleteKeyCode={null}
      >
        <Background color="#2b241b" gap={28} />
      </ReactFlow>
    </div>
  );
}
