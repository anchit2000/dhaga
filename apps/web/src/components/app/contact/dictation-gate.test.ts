/**
 * Why this exists: on iOS Safari (and any browser without WebGPU) the on-device
 * voice model must NEVER be loaded — onnxruntime throws an opaque "no available
 * backend" the moment its WASM path runs. The gate is the single choke point
 * that guarantees the real engine (the only thing that can load a model) is
 * handed out ONLY once a WebGPU adapter is confirmed. Each test pins one of
 * those guarantees, so it breaks if the business rule breaks — not on wording.
 */
import { describe, it, expect, vi } from "vitest";
import { resolveDictationState } from "./dictation-gate";
import type { DictationState } from "./useDictation";

/** A distinctive real-engine state — non-inert field values let us prove
 *  identity pass-through (webgpu === true must return THIS object untouched). */
function makeEngine(): DictationState {
  return {
    supported: true,
    listening: true,
    transcribing: true,
    loadingProgress: 42,
    partialText: "hello",
    start: vi.fn(),
    stop: vi.fn(),
  };
}

describe("resolveDictationState", () => {
  it("hands back the REAL engine only once WebGPU is confirmed (true)", () => {
    const engine = makeEngine();
    const onUnsupported = vi.fn();
    const state = resolveDictationState(true, engine, onUnsupported);
    // Identity: the untouched real engine — the ONLY path that can load a model.
    expect(state).toBe(engine);
    state.start();
    expect(engine.start).toHaveBeenCalledTimes(1); // the real start, not a no-op
    expect(onUnsupported).not.toHaveBeenCalled();
  });

  it("while probing (null) the engine is NOT startable — a tap can't race the probe", () => {
    const engine = makeEngine();
    const onUnsupported = vi.fn();
    const state = resolveDictationState(null, engine, onUnsupported);
    expect(state).not.toBe(engine);
    expect(state.start).not.toBe(engine.start); // cannot reach the real engine
    expect(state.supported).toBe(false); // control hidden ⇒ nothing to tap yet
    expect(state.loadingProgress).toBeNull(); // no "Downloading model…" UI
    state.start(); // a tap during the probe window
    expect(engine.start).not.toHaveBeenCalled(); // ...never loads the model
    expect(onUnsupported).not.toHaveBeenCalled(); // and doesn't misfire the warning
  });

  it("with no WebGPU (false) the control is inert + explains, and never loads a model", () => {
    const engine = makeEngine();
    const onUnsupported = vi.fn();
    const state = resolveDictationState(false, engine, onUnsupported);
    expect(state).not.toBe(engine);
    expect(state.supported).toBe(true); // stays visible so we can guide the user
    expect(state.loadingProgress).toBeNull(); // never any download UI
    state.start();
    expect(onUnsupported).toHaveBeenCalledTimes(1); // friendly "type instead" message
    expect(engine.start).not.toHaveBeenCalled(); // real engine never touched
  });
});
