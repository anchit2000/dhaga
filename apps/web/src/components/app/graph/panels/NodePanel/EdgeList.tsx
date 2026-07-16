"use client";

import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRAPH_PANEL_EDGE_ROW_CAP } from "@/utils/constants/graph";
import { panelEdgeLabel } from "../../logic/style";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "../../logic/indexes";
import type { FullGraphNode } from "../../types";

export interface EdgeRow {
  edgeId: string;
  other: FullGraphNode;
  /** Human relation label, already direction-corrected for the viewed node. */
  roleLabel: string;
}

export interface EdgeRowGroup {
  rows: EdgeRow[];
  /** True edge count for the direction — rows stop at the cap. */
  total: number;
}

/** Build the panel's directional edge rows, capped per direction while
 *  iterating — label work past the cap is waste at 1000s of attendees. */
export function buildEdgeRows(
  node: FullGraphNode | null,
  indexes: GraphIndexes,
  labelMap: RelationshipLabelMap,
): { incoming: EdgeRowGroup; outgoing: EdgeRowGroup } {
  const incoming: EdgeRowGroup = { rows: [], total: 0 };
  const outgoing: EdgeRowGroup = { rows: [], total: 0 };
  if (node) {
    for (const edge of indexes.edgesByNode.get(node.id) ?? []) {
      const viewerIsSource = edge.source === node.id;
      const other = indexes.nodeById.get(viewerIsSource ? edge.target : edge.source);
      if (!other) continue;
      const direction = viewerIsSource ? outgoing : incoming;
      direction.total += 1;
      if (direction.rows.length >= GRAPH_PANEL_EDGE_ROW_CAP) continue;
      direction.rows.push({
        edgeId: edge.id,
        other,
        roleLabel: panelEdgeLabel(edge, viewerIsSource, labelMap),
      });
    }
  }
  return { incoming, outgoing };
}

/** One direction of the selected node's relationships, with per-row fly-to. */
export function EdgeList({
  title,
  rows,
  total,
  onGoTo,
}: {
  title: string;
  /** Already capped by the caller (GRAPH_PANEL_EDGE_ROW_CAP) — rows cost a label computation each. */
  rows: readonly EdgeRow[];
  /** True edge count for this direction; drives the header count and "+N more". */
  total: number;
  onGoTo: (nodeId: string) => void;
}): React.ReactElement | null {
  if (total === 0) return null;
  const overflow = total - rows.length;

  return (
    <div className="space-y-1">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
        {title} · {total}
      </p>
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li
            key={row.edgeId}
            className="flex min-h-10 items-center gap-2 rounded-md px-1.5 hover:bg-wash/[0.04]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-paper">{row.other.label}</p>
              <p className="truncate text-xs text-fog">{row.roleLabel}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Go to ${row.other.label}`}
              onClick={() => onGoTo(row.other.id)}
            >
              <Crosshair aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {overflow > 0 ? (
        <p className="px-1.5 text-xs text-fog">+{overflow} more — use search to reach them.</p>
      ) : null}
    </div>
  );
}
