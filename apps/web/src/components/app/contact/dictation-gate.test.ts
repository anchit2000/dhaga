/**
 * Why this exists: on iOS Safari (and any browser without WebGPU) the on-device
 * voice model must NEVER be loaded — onnxruntime throws an opaque "no available
 * backend" the moment its WASM path runs. The gate is the single choke point
 * that guarantees the real engine (the only thing that can load a model) is
 * handed out ONLY once a WebGPU adapter is confirmed.
 *
 * It is also the single choke point for the BETA product rule: a control that
 * cannot work is greyed out and says "Coming soon" up front — never a live-
 * looking button that only explains itself after a tap. Every surface reads
 * that decision off `comingSoon` / `showsDictationControl`, so pinning it here
 * pins it for all of them. Each test pins one of those guarantees, so it breaks
 * if the business rule breaks — not on wording.
 */
import { describe, it, expect, vi } from "vitest";
import { DICTATION_NO_WEBGPU_COMING_SOON } from "@/utils/constants/coming-soon";
import { resolveDictationState, showsDictationControl } from "./dictation-gate";
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
    comingSoon: null,
    start: vi.fn(),
    stop: vi.fn(),
  };
}

describe("resolveDictationState", () => {
  it("hands back the REAL engine only once WebGPU is confirmed (true)", () => {
    const engine = makeEngine();
    const state = resolveDictationState(true, engine);
    // Identity: the untouched real engine — the ONLY path that can load a model.
    expect(state).toBe(engine);
    state.start();
    expect(engine.start).toHaveBeenCalledTimes(1); // the real start, not a no-op
    // A working mic must never be apologised for: no notice, fully live.
    expect(state.comingSoon).toBeNull();
    expect(showsDictationControl(state)).toBe(true);
  });

  it("while probing (null) the engine is NOT startable — a tap can't race the probe", () => {
    const engine = makeEngine();
    const state = resolveDictationState(null, engine);
    expect(state).not.toBe(engine);
    expect(state.start).not.toBe(engine.start); // cannot reach the real engine
    expect(state.supported).toBe(false);
    expect(state.loadingProgress).toBeNull(); // no "Downloading model…" UI
    state.start(); // a tap during the probe window
    expect(engine.start).not.toHaveBeenCalled(); // ...never loads the model
  });

  it("shows NOTHING while probing — a coming-soon pill here would flash on every load", () => {
    // The probe resolves post-mount, so this state is rendered by EVERY browser
    // for a beat, including ones where voice works. Leaking the greyed-out
    // treatment into it would blink "Coming soon" at users who have WebGPU.
    const state = resolveDictationState(null, makeEngine());
    expect(state.comingSoon).toBeNull();
    expect(showsDictationControl(state)).toBe(false);
  });

  it("with no WebGPU (false) the mic is greyed out UP FRONT, not live-then-sorry", () => {
    const engine = makeEngine();
    const state = resolveDictationState(false, engine);
    expect(state).not.toBe(engine);
    // The reason is present, so every surface disables the button and renders
    // the visible ComingSoonNotice. If this ever goes null again, the button
    // renders as a normal, tappable mic — the exact bug this replaced.
    expect(state.comingSoon).toBe(DICTATION_NO_WEBGPU_COMING_SOON);
    // ...and it is still SHOWN: greyed out, per the product rule, not vanished.
    expect(showsDictationControl(state)).toBe(true);
    // `supported` means "dictation can actually run here". It must stay false so
    // nothing (placeholder copy, the dock's Voice item) promises working voice.
    expect(state.supported).toBe(false);
    expect(state.loadingProgress).toBeNull(); // never any download UI
    state.start(); // even if a surface forgot `disabled`
    expect(engine.start).not.toHaveBeenCalled(); // real engine never touched
  });

  it("keeps the coming-soon reason out of `notice`, which means 'works, but degraded'", () => {
    // useVoiceSession sets `notice` when a RUNNING engine fell back to CPU.
    // Folding the two together would let a working-but-slower engine be greyed
    // out, and would grey the control on any future degraded state as well.
    const state = resolveDictationState(false, makeEngine());
    expect(state.notice).toBeNull();
  });
});
