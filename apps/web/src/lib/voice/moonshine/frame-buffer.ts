/**
 * FrameBuffer — the Moonshine engine's rolling PCM window. Owns the frame list
 * and the absolute↔physical offset bookkeeping, so the engine can slice any
 * absolute sample range while memory stays bounded on long (~15-min) recordings:
 * leading frames no future window can reach are physically dropped. Pure and
 * browser-free (Float32Array only), so the offset math is unit-testable in
 * isolation. Split out of engine.ts to keep that class within the 150-line rule.
 */
import type { PcmFrame } from "@dhaga/core/src/voice/types";
import { sliceRange } from "./streaming";

export class FrameBuffer {
  private chunks: Float32Array[] = [];
  private _totalLen = 0;
  /** Leading samples physically dropped from the front; `chunks` holds only the
   *  absolute range [droppedSamples, totalLen). Every window index subtracts it. */
  private droppedSamples = 0;

  /** Total samples pushed since the last reset — ABSOLUTE, never rebased, so the
   *  engine's chunk-boundary math is unaffected by pruning. */
  get totalLen(): number {
    return this._totalLen;
  }

  push(frame: PcmFrame): void {
    if (frame.length === 0) return;
    this.chunks.push(frame);
    this._totalLen += frame.length;
  }

  /** Materialize the absolute half-open sample window [from, to). */
  window(from: number, to: number): Float32Array {
    return sliceRange(this.chunks, from - this.droppedSamples, to - this.droppedSamples);
  }

  /** Drop whole leading frames whose absolute end is at or before `keepFrom`, so
   *  nothing a future window reaching back to `keepFrom` needs is lost. Whole
   *  frames only (never a partial): the retained buffer always starts on a frame
   *  boundary, so slices need no realignment or copy — only their offset shifts. */
  prune(keepFrom: number): void {
    while (this.chunks.length > 0 && this.droppedSamples + this.chunks[0].length <= keepFrom) {
      this.droppedSamples += this.chunks[0].length;
      this.chunks.shift();
    }
  }

  /** Detach the current audio into a new FrameBuffer and empty this one, all
   *  synchronously — so a new utterance's frames land in the fresh buffer while
   *  the detached copy is decoded for the final result (no await in between). */
  take(): FrameBuffer {
    const detached = new FrameBuffer();
    detached.chunks = this.chunks;
    detached._totalLen = this._totalLen;
    detached.droppedSamples = this.droppedSamples;
    this.reset();
    return detached;
  }

  reset(): void {
    this.chunks = [];
    this._totalLen = 0;
    this.droppedSamples = 0;
  }
}
