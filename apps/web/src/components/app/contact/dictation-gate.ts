import type { DictationState } from "./useDictation";

/**
 * Pure gate that decides, from the WebGPU-probe result, which DictationState a
 * voice control gets. Extracted from the hook so it's unit-testable without the
 * client/runtime graph (see dictation-gate.test.ts).
 *
 * WHY it exists: the real engine's model load reaches onnxruntime, which has no
 * usable backend without WebGPU (iOS Safari) and throws an opaque "no available
 * backend". So the real engine must be handed out ONLY once a WebGPU adapter is
 * confirmed — never while the async probe is still running.
 */

/** The shared inert shape for the two non-running states (probing / no WebGPU):
 *  nothing is loading, so no DictationProgress ("Downloading model…") renders
 *  and the engine is never touched. Callers override `supported`/`start`. */
function inert(overrides: Partial<DictationState>): DictationState {
  return {
    supported: false,
    listening: false,
    transcribing: false,
    loadingProgress: null,
    partialText: null,
    start: () => {},
    stop: () => {},
    notice: null,
    ...overrides,
  };
}

/**
 * - `true`  → WebGPU confirmed: hand back the real engine (the only path that
 *             can load a model / start dictation).
 * - `null`  → still probing: NOT startable. Keep the control hidden
 *             (`supported: false`) and no-op start so a tap during the probe
 *             window can never race a model load.
 * - `false` → no WebGPU: control stays visible but inert; tapping calls
 *             onUnsupported (the friendly "type instead" message) and no model
 *             is ever loaded.
 */
export function resolveDictationState(
  webgpu: boolean | null,
  engine: DictationState,
  onUnsupported: () => void,
): DictationState {
  if (webgpu === true) return engine;
  if (webgpu === null) return inert({});
  return inert({ supported: true, start: onUnsupported });
}
