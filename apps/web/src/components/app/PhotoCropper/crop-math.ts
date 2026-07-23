export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DragMode = "move" | "nw" | "ne" | "sw" | "se";

/** Below this, corner handles could cross each other and invert the rect. */
export const MIN_CROP_SIZE = 40;

/** Starting crop: an 8% inset from each edge — trims the desk/background
 *  margin a phone photo usually has, without guessing where the card is. */
export function defaultCropRect(width: number, height: number): CropRect {
  const insetX = width * 0.08;
  const insetY = height * 0.08;
  return {
    x: insetX,
    y: insetY,
    width: width - insetX * 2,
    height: height - insetY * 2,
  };
}

/** Keep a rect inside [0, bounds] and never smaller than MIN_CROP_SIZE,
 *  so a fast drag off the image edge can't produce an unusable crop. */
export function clampRect(
  rect: CropRect,
  bounds: { width: number; height: number },
): CropRect {
  const width = Math.min(Math.max(rect.width, MIN_CROP_SIZE), bounds.width);
  const height = Math.min(Math.max(rect.height, MIN_CROP_SIZE), bounds.height);
  const x = Math.min(Math.max(rect.x, 0), bounds.width - width);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - height);
  return { x, y, width, height };
}

/** Apply a pointer-drag delta to the rect captured at drag start. Corner
 *  modes resize from the dragged corner while pinning the opposite corner:
 *  a handle dragged inward past MIN_CROP_SIZE stops at the minimum against
 *  that fixed corner instead of crossing it and teleporting the box.
 *  "move" repositions without resizing. */
export function applyDrag(
  mode: DragMode,
  start: CropRect,
  dx: number,
  dy: number,
): CropRect {
  if (mode === "move") return { ...start, x: start.x + dx, y: start.y + dy };
  let { x, y, width, height } = start;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  if (mode.includes("n")) {
    // Top edge moves; bottom edge stays pinned. Cap at MIN so shrinking past
    // it re-anchors y against the fixed bottom rather than overshooting it.
    height = Math.max(start.height - dy, MIN_CROP_SIZE);
    y = bottom - height;
  }
  if (mode.includes("s")) {
    // Bottom edge moves; top edge (start.y) stays pinned.
    height = Math.max(start.height + dy, MIN_CROP_SIZE);
  }
  if (mode.includes("w")) {
    // Left edge moves; right edge stays pinned.
    width = Math.max(start.width - dx, MIN_CROP_SIZE);
    x = right - width;
  }
  if (mode.includes("e")) {
    // Right edge moves; left edge (start.x) stays pinned.
    width = Math.max(start.width + dx, MIN_CROP_SIZE);
  }
  return { x, y, width, height };
}

/** Rescale a rect from one display size to another so it keeps covering the
 *  same region of the image after the <img>'s rendered size changes (viewport
 *  resize, device rotation). Proportional on both axes. */
export function scaleRect(
  rect: CropRect,
  from: { width: number; height: number },
  to: { width: number; height: number },
): CropRect {
  if (from.width === 0 || from.height === 0) return rect;
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}
