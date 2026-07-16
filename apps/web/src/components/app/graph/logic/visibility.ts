import { layerKeyFor } from "./collapse";
import type { GraphIndexes } from "./indexes";
import type { GraphViewState } from "../types";

/**
 * The one visibility computation. Layers, collapse and isolate compose into a
 * single hidden-node set that sigma's reducers consult in O(1) — filters are
 * instant view changes, never graph rebuilds or re-layouts.
 *
 * Composition order matters and encodes intent:
 * 1. layer toggles remove whole kinds/types (and every edge touching them),
 * 2. collapse swallows members whose only remaining tether is the collapsed
 *    group — the caller computes that set once (contactsHiddenByCollapse,
 *    collapse.ts) and shares it with the count badges,
 * 3. isolate then narrows to the clicked node + 1st-degree neighbours — but
 *    never resurrects something a layer or collapse already hid, so "people
 *    I met at this event" respects the user's layer choices.
 */
export function computeHiddenNodes(
  indexes: GraphIndexes,
  state: Pick<GraphViewState, "hiddenLayers" | "isolateRootId">,
  hiddenByCollapse: ReadonlySet<string>,
): Set<string> {
  const hidden = new Set<string>();

  for (const node of indexes.nodeById.values()) {
    if (state.hiddenLayers.has(layerKeyFor(node))) hidden.add(node.id);
  }

  for (const contactId of hiddenByCollapse) {
    hidden.add(contactId);
  }

  if (state.isolateRootId) {
    const keep = new Set<string>([state.isolateRootId]);
    for (const neighborId of indexes.neighbors.get(state.isolateRootId) ?? []) {
      keep.add(neighborId);
    }
    for (const id of indexes.nodeById.keys()) {
      if (!keep.has(id)) hidden.add(id);
    }
    // The isolate root itself always shows, even if its layer was hidden —
    // the user explicitly asked for this node (deep link / search).
    hidden.delete(state.isolateRootId);
  }

  return hidden;
}

/** An edge renders only when both endpoints do. */
export function edgeIsVisible(
  source: string,
  target: string,
  hiddenNodes: ReadonlySet<string>,
): boolean {
  return !hiddenNodes.has(source) && !hiddenNodes.has(target);
}
