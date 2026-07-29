"use client";

import { useCallback } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMap } from "./context";

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // 44px on touch (mandatory minimum), tightened on pointer-precise widths.
      className={cn(
        "flex size-11 items-center justify-center text-paper transition-colors sm:size-9",
        "first:rounded-t-lg last:rounded-b-lg hover:bg-panel-2",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber",
      )}
    >
      {children}
    </button>
  );
}

/** Zoom controls, positioned clear of the attribution bar (`bottom-11`). */
export function MapControls({ className }: { className?: string }): React.ReactElement {
  const { map } = useMap();

  const zoomIn = useCallback(() => map?.zoomTo(map.getZoom() + 1, { duration: 300 }), [map]);
  const zoomOut = useCallback(() => map?.zoomTo(map.getZoom() - 1, { duration: 300 }), [map]);

  return (
    <div className={cn("absolute right-3 bottom-11 z-10", className)}>
      <div className="flex flex-col divide-y divide-seam overflow-hidden rounded-lg border border-seam bg-panel/95 shadow-sm">
        <ControlButton onClick={zoomIn} label="Zoom in">
          <Plus className="size-4" aria-hidden />
        </ControlButton>
        <ControlButton onClick={zoomOut} label="Zoom out">
          <Minus className="size-4" aria-hidden />
        </ControlButton>
      </div>
    </div>
  );
}
