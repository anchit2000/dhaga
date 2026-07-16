"use client";

import { MoveRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FullGraphNode } from "../types";

export interface EdgePopoverData {
  edgeId: string;
  label: string;
  source: FullGraphNode;
  target: FullGraphNode;
  /** Viewport coordinates of the click, relative to the canvas container. */
  x: number;
  y: number;
}

/** Best-effort edge inspection: full sentence + jump buttons to both ends.
 *  (The node side panel remains the primary relationship UX — sigma edge
 *  picking is approximate with parallel edges.) */
export function EdgePopover({
  data,
  onGoTo,
  onClose,
}: {
  data: EdgePopoverData;
  onGoTo: (nodeId: string) => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div
      className="pointer-events-auto absolute z-30 w-64 max-w-[calc(100%-1rem)] rounded-xl border border-seam bg-panel/95 p-3 shadow-lg backdrop-blur"
      style={{ left: Math.max(8, data.x - 128), top: data.y + 10 }}
      role="dialog"
      aria-label="Relationship details"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm leading-snug text-paper">
          {data.source.label} <span className="text-amber">— {data.label} →</span>{" "}
          {data.target.label}
        </p>
        <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Button variant="outline" size="xs" className="max-w-[45%]" onClick={() => onGoTo(data.source.id)}>
          <span className="truncate">{data.source.label}</span>
        </Button>
        <MoveRight className="size-3 shrink-0 text-fog" aria-hidden />
        <Button variant="outline" size="xs" className="max-w-[45%]" onClick={() => onGoTo(data.target.id)}>
          <span className="truncate">{data.target.label}</span>
        </Button>
      </div>
    </div>
  );
}
