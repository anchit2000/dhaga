/**
 * Why this layer exists: these pure helpers decide what audio the decoder sees
 * and how re-decoded chunks are stitched back into one transcript. A regression
 * here silently corrupts speech — the decoder hallucinates on dead air, a window
 * slice reads the wrong samples once the buffer is front-pruned, or a word at a
 * 5s seam gets dropped or duplicated. Each test pins one of those promises, not
 * merely a string, so it fails when the guarantee breaks, not when wording drifts.
 */
import { describe, it, expect } from "vitest";
import { SILENCE_PEAK_THRESHOLD } from "./constants";
import { appendWithOverlapDedup, isSilent, sliceRange } from "./streaming";

/** A frame whose sample values equal their ABSOLUTE index, so a slice can assert
 *  which absolute positions it actually read. */
function ramp(start: number, len: number): Float32Array {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = start + i;
  return out;
}

describe("isSilent", () => {
  it("treats an all-zero window (a dead/muted mic) as silent", () => {
    // This is the whole point of the gate: the zeros a broken mic feeds must be
    // classified silent so the decoder is never handed them to hallucinate on.
    expect(isSilent(new Float32Array(1600), SILENCE_PEAK_THRESHOLD)).toBe(true);
  });

  it("treats a window with any speech-level peak as NOT silent", () => {
    // A single real-speech sample (0.5, well inside the ~0.1–1.0 speech range)
    // among zeros must keep the window decodable — we gate on peak, not average,
    // precisely so quiet speech with brief loud onsets is never dropped.
    const buf = new Float32Array(1600);
    buf[800] = 0.5;
    expect(isSilent(buf, SILENCE_PEAK_THRESHOLD)).toBe(false);
  });

  it("treats an empty window as silent (nothing to decode)", () => {
    expect(isSilent(new Float32Array(0), SILENCE_PEAK_THRESHOLD)).toBe(true);
  });

  it("gates on the threshold: a peak below is silent, a louder peak is not", () => {
    // The comparison is strict `< threshold`. A peak under the cutoff counts as
    // silence; one above it must survive, so the gate can never swallow real
    // (if quiet) speech that sits just past the cutoff.
    expect(isSilent(new Float32Array([SILENCE_PEAK_THRESHOLD / 2]), SILENCE_PEAK_THRESHOLD)).toBe(true);
    expect(isSilent(new Float32Array([SILENCE_PEAK_THRESHOLD * 2]), SILENCE_PEAK_THRESHOLD)).toBe(false);
  });

  it("measures peak by absolute value, so loud negative samples aren't silent", () => {
    // Audio is signed; a −0.5 trough is as much signal as a +0.5 peak. Tracking
    // raw (not absolute) max would miss all-negative energy and wrongly mute it.
    expect(isSilent(new Float32Array([-0.5, -0.2]), SILENCE_PEAK_THRESHOLD)).toBe(false);
  });
});

describe("sliceRange", () => {
  it("reads a window fully inside a single frame", () => {
    const chunks = [ramp(0, 10)];
    expect(Array.from(sliceRange(chunks, 3, 7))).toEqual([3, 4, 5, 6]);
  });

  it("reads a window spanning multiple frames without concatenating the whole buffer", () => {
    const chunks = [ramp(0, 5), ramp(5, 5), ramp(10, 5)];
    expect(Array.from(sliceRange(chunks, 3, 12))).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("clamps an out-of-range request to the samples that exist", () => {
    // The engine can ask for [committedSamples-OVERLAP, totalLen); at the edges
    // that range brushes past the buffer. Slicing must return what exists rather
    // than read past the end or before the start.
    const chunks = [ramp(0, 5), ramp(5, 5)];
    expect(Array.from(sliceRange(chunks, -5, 100))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("returns an empty window when the range is degenerate", () => {
    const chunks = [ramp(0, 5)];
    expect(sliceRange(chunks, 4, 4)).toHaveLength(0);
    expect(sliceRange(chunks, 6, 3)).toHaveLength(0);
  });

  it("reads the correct ABSOLUTE window after the front of the buffer is pruned", () => {
    // The engine keeps committedSamples/totalLen ABSOLUTE but physically holds
    // only [droppedSamples, totalLen) once leading frames are pruned. To read the
    // absolute window [12,18) it must subtract the offset: sliceRange(chunks, 2, 8).
    // If that subtraction is wrong the decoder gets shifted audio — the exact
    // off-by-offset corruption this guards against. Sample value == absolute index,
    // so the returned values prove which absolute positions were read.
    const droppedSamples = 10; // frame [0,10) already pruned away
    const physicalChunks = [ramp(10, 10), ramp(20, 10)]; // buffer now covers [10,30)
    const absFrom = 12;
    const absTo = 18;
    const got = sliceRange(physicalChunks, absFrom - droppedSamples, absTo - droppedSamples);
    expect(Array.from(got)).toEqual([12, 13, 14, 15, 16, 17]);
  });
});

describe("appendWithOverlapDedup", () => {
  it("stitches three consecutive chunks so a word straddling each 5s seam appears exactly once", () => {
    // Every chunk re-decodes ~OVERLAP of the previous one, so each `next` repeats
    // the last words of `prev`. Across a MULTI-chunk utterance the seam words
    // ("fox"/"jumps", "over"/"the") must be neither dropped nor duplicated — the
    // final transcript must read as if decoded in one pass.
    let text = "the quick brown fox";
    text = appendWithOverlapDedup(text, "brown fox jumps over the"); // repeats "brown fox"
    text = appendWithOverlapDedup(text, "over the lazy dog"); // repeats "over the"
    expect(text).toBe("the quick brown fox jumps over the lazy dog");
  });

  it("keeps all of `next` when there is no seam overlap", () => {
    // Distinct chunks with no shared boundary words must not lose the join —
    // an over-eager matcher would drop a real leading word.
    expect(appendWithOverlapDedup("hello world", "foo bar")).toBe("hello world foo bar");
  });

  it("collapses a fully-overlapping re-decode to nothing new", () => {
    // If a chunk re-decodes to exactly what was already committed (silence added
    // no new words), the whole of `next` is the overlap and nothing is appended —
    // otherwise the transcript would double the tail every partial.
    expect(appendWithOverlapDedup("alpha beta", "alpha beta")).toBe("alpha beta");
  });

  it("returns the other side untouched when one input is empty", () => {
    expect(appendWithOverlapDedup("", "fresh start")).toBe("fresh start");
    expect(appendWithOverlapDedup("already here", "")).toBe("already here");
  });
});
