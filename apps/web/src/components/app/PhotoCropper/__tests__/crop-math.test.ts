import { describe, expect, it } from "vitest";
import {
  applyDrag,
  clampRect,
  defaultCropRect,
  MIN_CROP_SIZE,
} from "../crop-math";

/**
 * Pure crop math — the part of the cropper that can regress silently since
 * it's driven by pointer coordinates no test harness here can simulate.
 * These lock in the two properties a bad edit would break unnoticed: the
 * crop rect never leaves the photo, and it never inverts into a corner.
 */
describe("defaultCropRect", () => {
  it("insets 8% from each edge so the starting crop excludes typical desk margin", () => {
    const rect = defaultCropRect(1000, 500);
    expect(rect).toEqual({ x: 80, y: 40, width: 840, height: 420 });
  });
});

describe("clampRect", () => {
  const bounds = { width: 400, height: 300 };

  it("pulls an out-of-bounds rect back inside the image", () => {
    const rect = clampRect({ x: -50, y: 350, width: 100, height: 100 }, bounds);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.height);
  });

  it("never shrinks the crop below MIN_CROP_SIZE, even from a huge negative resize", () => {
    const rect = clampRect({ x: 50, y: 50, width: -500, height: -500 }, bounds);
    expect(rect.width).toBe(MIN_CROP_SIZE);
    expect(rect.height).toBe(MIN_CROP_SIZE);
  });

  it("never grows the crop past the image bounds", () => {
    const rect = clampRect({ x: 0, y: 0, width: 5000, height: 5000 }, bounds);
    expect(rect.width).toBe(bounds.width);
    expect(rect.height).toBe(bounds.height);
  });
});

describe("applyDrag", () => {
  const start = { x: 20, y: 20, width: 100, height: 100 };

  it("moves both axes without resizing", () => {
    expect(applyDrag("move", start, 10, -5)).toEqual({
      x: 30,
      y: 15,
      width: 100,
      height: 100,
    });
  });

  it("dragging the north-west handle inward shrinks from the top-left corner", () => {
    // Dragging nw right+down by 10 should shrink the rect, not move its
    // bottom-right edge — that's what distinguishes a resize from a move.
    const rect = applyDrag("nw", start, 10, 10);
    expect(rect).toEqual({ x: 30, y: 30, width: 90, height: 90 });
  });

  it("dragging the south-east handle only grows width/height, not position", () => {
    const rect = applyDrag("se", start, 10, 10);
    expect(rect).toEqual({ x: 20, y: 20, width: 110, height: 110 });
  });
});
