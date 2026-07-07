/**
 * Pure math for the crop overlay's drag/resize gestures — no React, no
 * Reanimated imports, so it's trivial to reason about and to call from
 * gesture worklets. Functions that run inside a gesture `.onUpdate` need the
 * `"worklet"` directive so Reanimated's Babel plugin can ship them to the UI
 * thread.
 *
 * All rects/points here are in "display" coordinates: relative to the
 * top-left of the photo as drawn on screen, not the screen itself and not
 * the photo's native pixel size (see `index.tsx` for the pixel conversion
 * used right before cropping).
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/** Default crop rect: inset from the full photo so the user mostly nudges
 * corners instead of drawing a rectangle from scratch. */
export function defaultCropRect(bounds: Size, insetXRatio: number, insetYRatio: number): Rect {
  const insetX = bounds.width * insetXRatio;
  const insetY = bounds.height * insetYRatio;
  return { x: insetX, y: insetY, width: bounds.width - insetX * 2, height: bounds.height - insetY * 2 };
}

/** Moves `rect` by (dx, dy), clamped so it never leaves `bounds`. */
export function moveRect(rect: Rect, dx: number, dy: number, bounds: Size): { x: number; y: number } {
  "worklet";
  return {
    x: clamp(rect.x + dx, 0, bounds.width - rect.width),
    y: clamp(rect.y + dy, 0, bounds.height - rect.height),
  };
}

/**
 * Resizes `rect` by dragging one corner. The opposite corner stays fixed;
 * the dragged corner moves with the gesture, clamped so it never crosses
 * `bounds` and never gets closer than `minSize` to the fixed corner.
 */
export function resizeRectFromCorner(
  rect: Rect,
  corner: Corner,
  dx: number,
  dy: number,
  bounds: Size,
  minSize: number,
): Rect {
  "worklet";
  const isLeft = corner === "topLeft" || corner === "bottomLeft";
  const isTop = corner === "topLeft" || corner === "topRight";

  const draggedX = isLeft ? rect.x : rect.x + rect.width;
  const draggedY = isTop ? rect.y : rect.y + rect.height;
  const anchorX = isLeft ? rect.x + rect.width : rect.x;
  const anchorY = isTop ? rect.y + rect.height : rect.y;

  let nextDraggedX = clamp(draggedX + dx, 0, bounds.width);
  nextDraggedX = isLeft ? Math.min(nextDraggedX, anchorX - minSize) : Math.max(nextDraggedX, anchorX + minSize);

  let nextDraggedY = clamp(draggedY + dy, 0, bounds.height);
  nextDraggedY = isTop ? Math.min(nextDraggedY, anchorY - minSize) : Math.max(nextDraggedY, anchorY + minSize);

  return {
    x: Math.min(anchorX, nextDraggedX),
    y: Math.min(anchorY, nextDraggedY),
    width: Math.abs(anchorX - nextDraggedX),
    height: Math.abs(anchorY - nextDraggedY),
  };
}

/** Where a photo of `natural` pixel size lands inside a `container` of the
 * given display size when fit with "contain" (letterboxed, not cropped). */
export function computeDisplayBox(natural: Size, container: Size): Rect {
  const scale = Math.min(container.width / natural.width, container.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return { x: (container.width - width) / 2, y: (container.height - height) / 2, width, height };
}
