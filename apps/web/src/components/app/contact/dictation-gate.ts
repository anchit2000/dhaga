import { DICTATION_NO_WEBGPU_COMING_SOON } from "@/utils/constants/coming-soon";
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
 *
 * The probe is a RUNTIME capability check, never a flag or a user-agent sniff,
 * so the control lights itself up the day the browser ships WebGPU.
 */

/** The shared inert shape for the two non-running states (probing / no WebGPU):
 *  nothing is loading, so no DictationProgress ("Downloading model…") renders
 *  and the engine is never touched. Callers override `comingSoon`. */
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
    comingSoon: null,
    ...overrides,
  };
}

/**
 * - `true`  → WebGPU confirmed: hand back the real engine (the only path that
 *             can load a model / start dictation).
 * - `null`  → still probing: NOT startable and NOT shown. No `comingSoon`
 *             either — a pill here would flash on every page load in a browser
 *             that turns out to support voice perfectly well.
 * - `false` → no WebGPU: `comingSoon` carries the reason, so the control renders
 *             greyed out and says so up front. `supported` stays false because
 *             dictation genuinely cannot run, and `start` is a no-op — the
 *             product rule forbids a live-looking button that only explains
 *             itself after a tap.
 */
export function resolveDictationState(
  webgpu: boolean | null,
  engine: DictationState,
): DictationState {
  if (webgpu === true) return engine;
  if (webgpu === null) return inert({});
  return inert({ comingSoon: DICTATION_NO_WEBGPU_COMING_SOON });
}

/**
 * The one render predicate every voice surface shares, so "unsupported" is
 * decided here and not re-derived in each component: show a mic when dictation
 * works, and when it is greyed out with a reason — but not while the probe is
 * still running, which is the only state that must render nothing at all.
 */
export function showsDictationControl(
  state: Pick<DictationState, "supported" | "comingSoon">,
): boolean {
  return state.supported || state.comingSoon !== null;
}
