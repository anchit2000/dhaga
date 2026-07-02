"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  type GraphScene,
} from "@/utils/constants/landing/graph";
import { AnnotationNode, PersonNode, type PersonData } from "./PersonNode";

const SCALE = 11;
const nodeTypes = { person: PersonNode, annotation: AnnotationNode };

function personData(id: string, scene: GraphScene): PersonData {
  const person = GRAPH_NODES.find((node) => node.id === id);
  if (!person) throw new Error(`Unknown graph node: ${id}`);
  return {
    person,
    lit: scene.litNodes.includes(id),
    dimmed: scene.dimOthers && !scene.litNodes.includes(id),
    hidden: Boolean(person.isNew && !scene.showNew),
    badge: scene.badgeOn === id,
    draft: scene.draftOn === id,
    facts: scene.factsOn === id,
  };
}

function buildNodes(scene: GraphScene): Node[] {
  const annotations: Node[] = [
    {
      id: "cluster",
      type: "annotation",
      position: { x: 78 * SCALE, y: 19 * SCALE },
      data: { kind: "cluster", visible: Boolean(scene.cluster) },
      draggable: false,
      selectable: false,
      zIndex: -1,
      style: { width: 1, height: 1 },
    },
    {
      id: "warm-label",
      type: "annotation",
      position: { x: 24 * SCALE, y: 20 * SCALE },
      data: { kind: "warmLabel", visible: Boolean(scene.warmLabel) },
      draggable: false,
      selectable: false,
      style: { width: 1, height: 1 },
    },
  ];
  const people: Node[] = GRAPH_NODES.map((node) => ({
    id: node.id,
    type: "person",
    position: { x: node.x * SCALE, y: node.y * SCALE },
    data: personData(node.id, scene),
    draggable: true,
    selectable: false,
    style: { width: 1, height: 1 },
  }));
  return [...annotations, ...people];
}

export function GraphStage({ scene }: { scene: GraphScene }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(scene));

  // Restyle on scene change; keep positions the user dragged.
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        if (node.type === "person") {
          return { ...node, data: personData(node.id, scene) };
        }
        const visible =
          node.id === "cluster" ? Boolean(scene.cluster) : Boolean(scene.warmLabel);
        return { ...node, data: { ...node.data, visible } };
      }),
    );
  }, [scene, setNodes]);

  const edges: Edge[] = useMemo(
    () =>
      GRAPH_EDGES.map((edge) => {
        const key = `${edge.from}-${edge.to}`;
        const lit = scene.litEdges.includes(key);
        const touchesNew =
          GRAPH_NODES.find((n) => n.id === edge.from)?.isNew ||
          GRAPH_NODES.find((n) => n.id === edge.to)?.isNew;
        return {
          id: key,
          source: edge.from,
          target: edge.to,
          type: "straight",
          animated: lit,
          style: {
            stroke: lit ? "#e2a44c" : "#4a3d2b",
            strokeWidth: lit ? 2 : 1,
            opacity: touchesNew && !scene.showNew ? 0 : lit ? 1 : scene.dimOthers ? 0.35 : 0.8,
            filter: lit ? "drop-shadow(0 0 5px rgba(226,164,76,0.9))" : "none",
            transition: "all 0.7s",
          },
        };
      }),
    [scene],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
      nodesConnectable={false}
      edgesFocusable={false}
      proOptions={{ hideAttribution: true }}
      className="!bg-transparent"
    />
  );
}
