import { describe, expect, it } from "vitest";
import { FrameBuffer } from "./frame-buffer";

/**
 * FrameBuffer owns the absolute↔physical offset math that makes long recordings
 * memory-safe. A bug here silently corrupts the audio window fed to the model, so
 * these tests pin the WHY: an absolute window must read the same samples before
 * and after pruning, and pruning must never drop audio a later window still needs.
 *
 * Convention: each sample's VALUE equals its ABSOLUTE index, so a window over
 * [from, to) must come back as exactly [from, from+1, …, to-1].
 */
function pushIndexedFrames(buffer: FrameBuffer, total: number, frameSize: number): void {
  for (let start = 0; start < total; start += frameSize) {
    const len = Math.min(frameSize, total - start);
    const frame = new Float32Array(len);
    for (let j = 0; j < len; j++) frame[j] = start + j;
    buffer.push(frame);
  }
}

function toArray(samples: Float32Array): number[] {
  return Array.from(samples);
}

describe("FrameBuffer", () => {
  it("tracks totalLen as the absolute sample count pushed", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 10, 4);
    expect(buffer.totalLen).toBe(10);
  });

  it("ignores empty frames", () => {
    const buffer = new FrameBuffer();
    buffer.push(new Float32Array(0));
    expect(buffer.totalLen).toBe(0);
  });

  it("materializes an absolute window spanning multiple frames", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 12, 4); // frames [0-3][4-7][8-11]
    expect(toArray(buffer.window(2, 9))).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("clamps a window to the available range", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 6, 4);
    expect(toArray(buffer.window(4, 100))).toEqual([4, 5]);
  });

  it("prune drops only WHOLE leading frames past keepFrom, and later windows still read correct absolute samples", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 12, 4); // frames [0-3][4-7][8-11]
    // keepFrom = 6 lands inside the 2nd frame ([4-7]): the 1st frame (ends at 4)
    // is droppable; the 2nd (ends at 8 > 6) must be KEPT so [6,7] survive.
    buffer.prune(6);
    expect(buffer.totalLen).toBe(12); // absolute counter is unchanged by pruning
    // The offset must be applied: these read the true absolute samples, not shifted ones.
    expect(toArray(buffer.window(6, 12))).toEqual([6, 7, 8, 9, 10, 11]);
    expect(toArray(buffer.window(4, 8))).toEqual([4, 5, 6, 7]);
  });

  it("prune keeps a frame that straddles keepFrom (never drops a partial frame)", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 8, 4); // [0-3][4-7]
    buffer.prune(5); // 1st frame ends at 4 (<=5, drop); 2nd ends at 8 (>5, keep)
    expect(toArray(buffer.window(4, 8))).toEqual([4, 5, 6, 7]);
  });

  it("prune is a no-op when nothing is fully past keepFrom", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 8, 4);
    buffer.prune(0);
    expect(toArray(buffer.window(0, 8))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("take() detaches the current audio and empties the live buffer", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 8, 4);
    const snapshot = buffer.take();
    expect(buffer.totalLen).toBe(0);
    expect(toArray(buffer.window(0, 8))).toEqual([]); // live buffer is empty
    // The detached copy still holds the audio for the final decode.
    expect(snapshot.totalLen).toBe(8);
    expect(toArray(snapshot.window(2, 6))).toEqual([2, 3, 4, 5]);
  });

  it("take() preserves the prune offset in the detached copy", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 12, 4);
    buffer.prune(6);
    const snapshot = buffer.take();
    expect(toArray(snapshot.window(6, 12))).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it("reset clears everything", () => {
    const buffer = new FrameBuffer();
    pushIndexedFrames(buffer, 8, 4);
    buffer.reset();
    expect(buffer.totalLen).toBe(0);
    expect(toArray(buffer.window(0, 8))).toEqual([]);
  });
});
