"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  applyDrag,
  clampRect,
  defaultCropRect,
  type CropRect,
  type DragMode,
} from "./crop-math";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startRect: CropRect;
}

/** Owns the crop rect's state and pointer-drag math so PhotoCropper only
 *  has to render. Mouse and touch both flow through the Pointer Events API,
 *  captured on the handle so a fast drag off it still tracks correctly. */
export function useCropRect() {
  const dragRef = useRef<DragState | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);

  function onImageLoad(img: HTMLImageElement): void {
    const bounds = { width: img.clientWidth, height: img.clientHeight };
    setDisplaySize(bounds);
    setRect(defaultCropRect(bounds.width, bounds.height));
  }

  function beginDrag(mode: DragMode) {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!rect) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { mode, startX: event.clientX, startY: event.clientY, startRect: rect };
    };
  }

  function onDragMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || !displaySize) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setRect(clampRect(applyDrag(drag.mode, drag.startRect, dx, dy), displaySize));
  }

  function endDrag(): void {
    dragRef.current = null;
  }

  return { rect, displaySize, onImageLoad, beginDrag, onDragMove, endDrag };
}
