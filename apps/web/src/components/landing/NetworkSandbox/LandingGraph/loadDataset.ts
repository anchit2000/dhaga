import { buildGraphIndexes } from "@/components/app/graph/logic/indexes";
import type { FullGraphEdge, FullGraphNode, FullGraphPayload, PositionMap } from "@/components/app/graph/types";
import type { SandboxDataset } from "./useLandingGraph";

interface BakedNode {
  id: string;
  kind: FullGraphNode["kind"];
  label: string;
  sublabel?: string;
  typeId?: string;
  x: number;
  y: number;
}

interface BakedPayload {
  nodes: BakedNode[];
  edges: FullGraphEdge[];
  nodeTypes: FullGraphPayload["nodeTypes"];
  relationshipTypes: FullGraphPayload["relationshipTypes"];
}

/** Turns a baked public JSON asset into the exact data shape the app renderer consumes. */
export async function loadGraphDataset(url: string): Promise<SandboxDataset> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  const raw = (await response.json()) as BakedPayload;
  const nodes: FullGraphNode[] = raw.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    label: node.label,
    sublabel: node.sublabel ?? null,
    ...(node.typeId ? { typeId: node.typeId } : {}),
  }));
  const positions: PositionMap = new Map(
    raw.nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
  );
  const payload: FullGraphPayload = {
    nodes,
    edges: raw.edges,
    nodeTypes: raw.nodeTypes,
    relationshipTypes: raw.relationshipTypes,
  };
  return { payload, positions, indexes: buildGraphIndexes(payload) };
}
