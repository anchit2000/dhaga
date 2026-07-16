import type { GraphIndexes } from "./indexes";
import type { FullGraphNode, LayerKey } from "../types";

/** Layer key a node belongs to: entities filter by their custom type, others by kind. */
export function layerKeyFor(node: FullGraphNode): LayerKey {
  return node.kind === "entity" ? (node.typeId ?? "entity") : node.kind;
}

/**
 * Contacts hidden by collapsed company/event groups.
 *
 * A member contact disappears only when the collapsed group was its last
 * visible tether: every neighbour is either a collapsed group it belongs to
 * or already hidden by a layer toggle. A contact with any other visible
 * connection (a friend, a second company) stays on canvas — collapsing
 * "Acme" must not vanish someone you also know socially.
 */
export function contactsHiddenByCollapse(
  indexes: GraphIndexes,
  collapsedGroups: ReadonlySet<string>,
  hiddenLayers: ReadonlySet<LayerKey>,
): Set<string> {
  const hidden = new Set<string>();
  if (collapsedGroups.size === 0) return hidden;

  const candidates = new Set<string>();
  for (const groupId of collapsedGroups) {
    for (const contactId of indexes.groupMembers.get(groupId) ?? []) {
      candidates.add(contactId);
    }
  }

  for (const contactId of candidates) {
    let anchored = false;
    for (const neighborId of indexes.neighbors.get(contactId) ?? []) {
      if (collapsedGroups.has(neighborId)) continue;
      const neighbor = indexes.nodeById.get(neighborId);
      if (!neighbor || hiddenLayers.has(layerKeyFor(neighbor))) continue;
      anchored = true;
      break;
    }
    if (!anchored) hidden.add(contactId);
  }
  return hidden;
}

/** How many of a collapsed group's members are currently swallowed by it — the count badge. */
export function collapsedMemberCount(
  groupId: string,
  indexes: GraphIndexes,
  hiddenByCollapse: ReadonlySet<string>,
): number {
  let count = 0;
  for (const contactId of indexes.groupMembers.get(groupId) ?? []) {
    if (hiddenByCollapse.has(contactId)) count += 1;
  }
  return count;
}
