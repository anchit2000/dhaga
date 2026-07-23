"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  applyDrag,
  clampRect,
  defaultCropRect,
  scaleRect,
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
  // Mirror of displaySize the ResizeObserver reads synchronously, so it can
  // scale the selection off the previous size without nesting setState calls.
  const displaySizeRef = useRef<{ width: number; height: number } | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [rect, setRect] = useState<CropRect | null>(null);

  function onImageLoad(img: HTMLImageElement): void {
    const bounds = { width: img.clientWidth, height: img.clientHeight };
    displaySizeRef.current = bounds;
    setImgEl(img);
    setDisplaySize(bounds);
    setRect(defaultCropRect(bounds.width, bounds.height));
  }

  // displaySize can't be captured once: a viewport resize or device rotation
  // re-lays-out the <img>, and handleConfirm scales the export by it — a stale
  // value exports the wrong region. Track the rendered size live and rescale
  // the in-progress selection so it keeps covering the same part of the image.
  useEffect(() => {
    if (!imgEl) return;
    const observer = new ResizeObserver(() => {
      const prev = displaySizeRef.current;
      const next = { width: imgEl.clientWidth, height: imgEl.clientHeight };
      if (next.width === 0 || next.height === 0) return;
      if (prev && prev.width === next.width && prev.height === next.height) return;
      displaySizeRef.current = next;
      setDisplaySize(next);
      if (prev) setRect((current) => (current ? clampRect(scaleRect(current, prev, next), next) : current));
    });
    observer.observe(imgEl);
    return () => observer.disconnect();
  }, [imgEl]);

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
