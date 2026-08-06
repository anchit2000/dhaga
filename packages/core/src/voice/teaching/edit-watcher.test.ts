/**
 * Why this layer exists: when a user fixes a mis-transcribed name by hand, that
 * edit is free training data — but only for distinctive terms. These tests pin
 * the conservative bias: it learns proper nouns and stays silent on filler,
 * because a false positive pollutes the dictionary and causes over-corrections.
 */
import { describe, it, expect } from "vitest";
import { HeuristicEditWatcher } from "./edit-watcher";

const watcher = new HeuristicEditWatcher();

describe("HeuristicEditWatcher.candidates", () => {
  it("learns the proper noun the user added, not the wrong word they removed", () => {
    // Fixing "rankit" → "Ranchit" must teach the RIGHT spelling. Returning the
    // removed token would re-teach the very mistake we are trying to fix.
    expect(watcher.candidates("my name is rankit", "my name is Ranchit")).toEqual(["Ranchit"]);
  });

  it("returns nothing when the only edit is a common word", () => {
    // Rearranging ordinary prose is not something to memorize.
    expect(watcher.candidates("i saw a cat", "i saw the cat")).toEqual([]);
  });

  it("ignores pure numbers", () => {
    expect(watcher.candidates("call me at", "call me at 4045551234")).toEqual([]);
  });

  it("ignores tokens shorter than three characters", () => {
    // "ML" is distinctive but too short to trust as a learnable term.
    expect(watcher.candidates("the plan", "the ML plan")).toEqual([]);
  });

  it("deduplicates repeated additions of the same term", () => {
    expect(watcher.candidates("meet rankit", "meet Ranchit and Ranchit")).toEqual(["Ranchit"]);
  });

  it("returns nothing when text is unchanged", () => {
    expect(watcher.candidates("hello there", "hello there")).toEqual([]);
  });
});
