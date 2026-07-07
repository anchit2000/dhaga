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
 *  modes resize from that corner; "move" repositions without resizing. */
export function applyDrag(
  mode: DragMode,
  start: CropRect,
  dx: number,
  dy: number,
): CropRect {
  if (mode === "move") return { ...start, x: start.x + dx, y: start.y + dy };
  let { x, y, width, height } = start;
  if (mode.includes("n")) {
    y = start.y + dy;
    height = start.height - dy;
  }
  if (mode.includes("s")) {
    height = start.height + dy;
  }
  if (mode.includes("w")) {
    x = start.x + dx;
    width = start.width - dx;
  }
  if (mode.includes("e")) {
    width = start.width + dx;
  }
  return { x, y, width, height };
}
