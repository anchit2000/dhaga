"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { CropRect, DragMode } from "./crop-math";

const CORNERS: DragMode[] = ["nw", "ne", "sw", "se"];

/** The draggable rect plus four corner handles, positioned over the
 *  displayed image. Each handle is a 44x44 touch target per the mobile
 *  touch-target rule; pointer events cover mouse, touch, and pen alike. */
export function CropOverlay({
  rect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  rect: CropRect;
  onDragStart: (mode: DragMode) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <>
      <div
        onPointerDown={onDragStart("move")}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="absolute touch-none cursor-move border-2 border-amber bg-amber/10"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      />
      {CORNERS.map((corner) => (
        <div
          key={corner}
          onPointerDown={onDragStart(corner)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="absolute flex size-11 touch-none items-center justify-center rounded-full bg-amber"
          style={{
            left: rect.x + (corner.includes("w") ? 0 : rect.width) - 22,
            top: rect.y + (corner.includes("n") ? 0 : rect.height) - 22,
            cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
          }}
        >
          <div className="size-3 rounded-full bg-ink" />
        </div>
      ))}
    </>
  );
}
