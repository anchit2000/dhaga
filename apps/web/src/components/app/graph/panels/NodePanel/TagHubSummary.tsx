"use client";

import type { FullGraphNode } from "../../types";

/**
 * Tag hubs carry the server's aggregate memberCount (the spoke edges may be
 * lazily loaded, capped, or refused by the edge budget) — show the true size,
 * and how many members the canvas is NOT showing when the counts disagree.
 */
export function TagHubSummary({
  node,
  spokesShown,
}: {
  node: FullGraphNode;
  /** Tag-edge degree from the live indexes = spokes actually merged. */
  spokesShown: number;
}): React.ReactElement | null {
  if (node.kind !== "tag" || node.memberCount === undefined) return null;
  const notShown = node.memberCount - spokesShown;
  return (
    <div className="space-y-0.5">
      <p className="text-sm text-paper">
        {node.memberCount} tagged {node.memberCount === 1 ? "person" : "people"}
      </p>
      {notShown > 0 ? <p className="text-xs text-fog">+{notShown} more not shown</p> : null}
    </div>
  );
}
