import type { GraphIndexes } from "./indexes";
import type { FullGraphNode } from "../types";

export interface CircleOption {
  id: string;
  label: string;
  kind: "event" | "tag";
  memberCount: number;
}

/**
 * Events and tags that can act as "circles": at least two contact members,
 * biggest first — a one-person circle is noise, not a group.
 */
export function buildCircleOptions(
  nodes: readonly FullGraphNode[],
  indexes: GraphIndexes,
): CircleOption[] {
  const list: CircleOption[] = [];
  for (const node of nodes) {
    if (node.kind !== "event" && node.kind !== "tag") continue;
    let memberCount = 0;
    for (const neighborId of indexes.neighbors.get(node.id) ?? []) {
      if (indexes.nodeById.get(neighborId)?.kind === "contact") memberCount += 1;
    }
    if (memberCount >= 2) {
      list.push({ id: node.id, label: node.label, kind: node.kind, memberCount });
    }
  }
  return list.sort((a, b) => b.memberCount - a.memberCount || a.label.localeCompare(b.label));
}
