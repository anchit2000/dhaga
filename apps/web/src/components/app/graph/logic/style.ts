import {
  buildRelationshipLabelMap,
  humanizePredicate,
  relationshipRole,
  type RelationshipLabelMap,
} from "@dhaga/core";
import {
  GRAPH_ENTITY_FALLBACK_COLOR,
  GRAPH_NODE_COLORS,
} from "@/utils/constants/graph";
import type { FullGraphEdge, FullGraphNode, GraphNodeType } from "../types";

/** Node fill by kind; entity nodes carry their user-chosen node-type colour. */
export function nodeColor(node: FullGraphNode, typeColors: ReadonlyMap<string, string>): string {
  if (node.kind === "entity") {
    return (node.typeId && typeColors.get(node.typeId)) || GRAPH_ENTITY_FALLBACK_COLOR;
  }
  return GRAPH_NODE_COLORS[node.kind];
}

export function buildTypeColorMap(nodeTypes: readonly GraphNodeType[]): Map<string, string> {
  return new Map(nodeTypes.map((type) => [type.id, type.color]));
}

export { buildRelationshipLabelMap };

/** On-canvas edge label, read in the arrow's direction ("works at", "father of"). */
export function edgeLabel(edge: FullGraphEdge, custom: RelationshipLabelMap): string {
  const labels = custom[edge.predicate];
  if (labels) return labels.forward;
  return humanizePredicate(edge.predicate);
}

/**
 * Side-panel row label: how the OTHER endpoint relates to the viewed node.
 * Explicit person edges go through relationshipRole so a stored parent_of
 * reads "child"/"parent" correctly from either seat; synthesized edges
 * (works_at/attended/tagged) read as the plain predicate phrase.
 */
export function panelEdgeLabel(
  edge: FullGraphEdge,
  viewerIsSource: boolean,
  custom: RelationshipLabelMap,
): string {
  if (edge.kind !== "explicit") return humanizePredicate(edge.predicate);
  return relationshipRole(edge.predicate, viewerIsSource, custom);
}

/**
 * Mix a hex colour toward the background — the "dimmed" treatment for
 * non-neighbours during hover/path emphasis. Pure math so WebGL never pays
 * for CSS colour parsing per frame.
 */
export function fadeColor(hex: string, backgroundHex: string, amount: number): string {
  const from = parseHex(hex);
  const to = parseHex(backgroundHex);
  if (!from || !to) return hex;
  const t = Math.min(1, Math.max(0, amount));
  const mix = from.map((channel, i) => Math.round(channel + (to[i] - channel) * t));
  return `#${mix.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.length === 6 ? raw : null;
  if (!full) return null;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return null;
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
