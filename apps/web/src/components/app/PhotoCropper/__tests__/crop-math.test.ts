import { describe, expect, it } from "vitest";
import {
  applyDrag,
  clampRect,
  defaultCropRect,
  MIN_CROP_SIZE,
  scaleRect,
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

  // A corner dragged inward past MIN_CROP_SIZE must stop at the minimum against
  // its fixed opposite corner — never keep translating x/y past it, which would
  // teleport the box and export a different region than the handles show.
  describe("corner dragged inward past MIN_CROP_SIZE stays pinned to the opposite corner", () => {
    const small = { x: 100, y: 100, width: 50, height: 50 };

    it("nw stops MIN against the fixed SE corner (150,150), not teleporting to (180,180)", () => {
      const rect = applyDrag("nw", small, 80, 80);
      expect(rect).toEqual({
        x: 150 - MIN_CROP_SIZE,
        y: 150 - MIN_CROP_SIZE,
        width: MIN_CROP_SIZE,
        height: MIN_CROP_SIZE,
      });
      // SE corner unmoved.
      expect(rect.x + rect.width).toBe(150);
      expect(rect.y + rect.height).toBe(150);
    });

    it("ne stays pinned to the fixed SW corner (100,150)", () => {
      const rect = applyDrag("ne", small, -80, 80);
      expect(rect).toEqual({ x: 100, y: 110, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE });
      expect(rect.x).toBe(100);
      expect(rect.y + rect.height).toBe(150);
    });

    it("sw stays pinned to the fixed NE corner (150,100)", () => {
      const rect = applyDrag("sw", small, 80, -80);
      expect(rect).toEqual({ x: 110, y: 100, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE });
      expect(rect.x + rect.width).toBe(150);
      expect(rect.y).toBe(100);
    });

    it("se stays pinned to the fixed NW corner (100,100)", () => {
      const rect = applyDrag("se", small, -80, -80);
      expect(rect).toEqual({ x: 100, y: 100, width: MIN_CROP_SIZE, height: MIN_CROP_SIZE });
    });
  });
});

describe("scaleRect", () => {
  it("rescales the selection proportionally so it covers the same region after a resize", () => {
    const rect = scaleRect(
      { x: 100, y: 100, width: 100, height: 100 },
      { width: 400, height: 400 },
      { width: 200, height: 200 },
    );
    expect(rect).toEqual({ x: 50, y: 50, width: 50, height: 50 });
  });

  it("returns the rect unchanged when the previous size is degenerate", () => {
    const rect = { x: 10, y: 10, width: 20, height: 20 };
    expect(scaleRect(rect, { width: 0, height: 0 }, { width: 200, height: 200 })).toEqual(rect);
  });
});
