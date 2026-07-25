"use client";

import { toast } from "sonner";
import { useVoiceSession, useWebGpuAvailable } from "@/lib/voice/use-voice-session";

export { isWebGpuAvailable } from "@/lib/voice/capability";

/**
 * Voice dictation, web edition — Moonshine only ("Dhaga Voice"): on-device
 * Moonshine ASR (transformers.js) with deterministic phonetic teaching,
 * streaming live while you talk. It requires WebGPU; where WebGPU is
 * unavailable there is no fallback engine — the Voice button stays visible but
 * explains, on tap, that voice needs WebGPU. The engine itself lives in
 * @/lib/voice/use-voice-session.
 */

const NO_WEBGPU_MESSAGE =
  "Voice needs WebGPU, which isn't available in this browser. Try Chrome or Edge on a device with WebGPU.";

export interface DictationState {
  supported: boolean;
  listening: boolean;
  /** True while a recorded clip is being transcribed. */
  transcribing: boolean;
  /** Model download percentage on first use; null otherwise. */
  loadingProgress: number | null;
  /** Live rolling transcript while listening. */
  partialText: string | null;
  start(): void;
  stop(): void;
  /** Dhaga Voice backend once the model has loaded (WebGPU or, on CPU, WASM). */
  backend?: "webgpu" | "wasm";
  /** A degraded-state notice to surface (e.g. no WebGPU); null/undefined if none. */
  notice?: string | null;
}

/** Dhaga Voice (Moonshine) dictation. WebGPU-only: when it's unavailable the
 *  Voice button stays visible but inert, warning why on tap — no CPU/WASM or
 *  browser-engine fallback. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  // Both hooks run unconditionally (rules-of-hooks) before we branch.
  const moonshine = useVoiceSession(onFinalText);
  const webgpu = useWebGpuAvailable();
  // No WebGPU → keep the button visible but inert, explaining why on tap.
  if (webgpu === false) {
    return {
      supported: true,
      listening: false,
      transcribing: false,
      loadingProgress: null,
      partialText: null,
      start: () => toast.warning(NO_WEBGPU_MESSAGE),
      stop: () => {},
      notice: null,
    };
  }
  // Still probing (null) or available (true): hand back the Moonshine state
  // directly — its own start() guards against running before it's ready.
  return moonshine;
}
