import { describe, expect, it } from "vitest";
import { createHoverGate, type HoverGate } from "../canvas/hover-gate";

/**
 * The hover gate exists to keep drag-pans smooth: every enter/leave used to
 * trigger a full O(N+E) reducer sweep (measured: 17.4 avg fps / 583ms worst
 * frame at 63k edges as nodes streamed under the dragging cursor). These
 * tests pin the two guarantees — at most one applied sweep per frame, and
 * zero hover sweeps while the pointer is down — without which the fix
 * regresses silently.
 */
function harness(): {
  gate: HoverGate;
  applies: (string | null)[];
  frame: () => void;
  pending: () => number;
} {
  const applies: (string | null)[] = [];
  const queue = new Map<number, () => void>();
  let nextHandle = 1;
  const gate = createHoverGate(
    (hoveredId) => applies.push(hoveredId),
    (flush) => {
      const handle = nextHandle++;
      queue.set(handle, flush);
      return handle;
    },
    (handle) => queue.delete(handle),
  );
  const frame = (): void => {
    const flushes = [...queue.values()];
    queue.clear();
    for (const flush of flushes) flush();
  };
  return { gate, applies, frame, pending: () => queue.size };
}

describe("hover gate: rAF coalescing + drag suppression", () => {
  it("coalesces an event burst into one apply per frame, last event winning", () => {
    const { gate, applies, frame } = harness();
    gate.enter("a");
    gate.enter("b");
    gate.leave();
    gate.enter("c");
    expect(applies).toEqual([]); // nothing sweeps between frames
    frame();
    expect(applies).toEqual(["c"]); // one sweep, not four
  });

  it("skips the sweep entirely when a burst nets out to the applied state", () => {
    const { gate, applies, frame } = harness();
    gate.enter("a");
    frame();
    expect(applies).toEqual(["a"]);
    gate.leave();
    gate.enter("a"); // left and re-entered the same node within a frame
    frame();
    expect(applies).toEqual(["a"]); // no redundant sweep
  });

  it("pointer down clears an active hover with exactly one sweep and mutes events until pointer up", () => {
    const { gate, applies, frame, pending } = harness();
    gate.enter("a");
    frame();
    gate.pointerDown();
    expect(applies).toEqual(["a", null]); // the drag starts un-hovered
    gate.enter("b"); // nodes streaming under the dragging cursor…
    gate.leave();
    gate.enter("c");
    expect(pending()).toBe(0); // …schedule nothing at all
    frame();
    expect(applies).toEqual(["a", null]); // zero sweeps during the drag
  });

  it("pointer down with no active hover applies nothing (no gratuitous sweep)", () => {
    const { gate, applies } = harness();
    gate.pointerDown();
    expect(applies).toEqual([]);
  });

  it("pointer down cancels an already-scheduled flush so no stale hover lands mid-drag", () => {
    const { gate, applies, frame } = harness();
    gate.enter("a"); // scheduled but not yet flushed
    gate.pointerDown();
    frame();
    expect(applies).toEqual([]); // the pre-drag hover never applies
  });

  it("pointer up resumes staging so hover works after the drag", () => {
    const { gate, applies, frame } = harness();
    gate.pointerDown();
    gate.pointerUp();
    gate.enter("b");
    frame();
    expect(applies).toEqual(["b"]);
  });

  it("dispose cancels a pending flush (teardown must not sweep a dead sigma)", () => {
    const { gate, applies, frame } = harness();
    gate.enter("a");
    gate.dispose();
    frame();
    expect(applies).toEqual([]);
  });
});
