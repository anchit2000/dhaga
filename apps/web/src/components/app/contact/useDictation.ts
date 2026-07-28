"use client";

import { toast } from "sonner";
import { useVoiceSession, useWebGpuAvailable } from "@/lib/voice/use-voice-session";
import { resolveDictationState } from "./dictation-gate";

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
  "Voice notes need a browser with WebGPU (try Chrome on desktop). On this device, just type your note instead.";

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

/** Dhaga Voice (Moonshine) dictation. WebGPU-only: the real engine is handed
 *  out ONLY once the WebGPU probe confirms an adapter (webgpu === true). While
 *  probing (null) voice is not-ready and start is inert, so a tap can't race the
 *  model loader (which would otherwise hit onnxruntime's "no available backend"
 *  on iOS Safari); when unavailable (false) the button stays visible but inert,
 *  warning why on tap — no CPU/WASM or browser-engine fallback. See
 *  ./dictation-gate for the pure decision + its tests. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  // Both hooks run unconditionally (rules-of-hooks) before we gate.
  const moonshine = useVoiceSession(onFinalText);
  const webgpu = useWebGpuAvailable();
  return resolveDictationState(webgpu, moonshine, () => toast.warning(NO_WEBGPU_MESSAGE));
}
