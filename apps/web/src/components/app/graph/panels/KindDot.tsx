import { buildTypeColorMap, nodeColor } from "../logic/style";
import type { FullGraphNode, GraphNodeType } from "../types";

const KIND_LABELS: Record<FullGraphNode["kind"], string> = {
  contact: "Person",
  company: "Company",
  event: "Event",
  entity: "Entity",
  tag: "Tag",
};

/** Small colour swatch matching the node's on-canvas fill. */
export function KindDot({
  node,
  nodeTypes,
}: {
  node: FullGraphNode;
  nodeTypes: readonly GraphNodeType[];
}): React.ReactElement {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: nodeColor(node, buildTypeColorMap(nodeTypes)) }}
    />
  );
}

/** Human name for a node's kind — entities read as their custom type. */
export function kindLabel(node: FullGraphNode, nodeTypes: readonly GraphNodeType[]): string {
  if (node.kind === "entity") {
    const type = nodeTypes.find((candidate) => candidate.id === node.typeId);
    return type?.name ?? KIND_LABELS.entity;
  }
  return KIND_LABELS[node.kind];
}
