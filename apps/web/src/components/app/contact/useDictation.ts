"use client";

import { useVoiceSession, useWebGpuAvailable } from "@/lib/voice/use-voice-session";
import { resolveDictationState } from "./dictation-gate";

export { isWebGpuAvailable } from "@/lib/voice/capability";

/**
 * Voice dictation, web edition — Moonshine only ("Dhaga Voice"): on-device
 * Moonshine ASR (transformers.js) with deterministic phonetic teaching,
 * streaming live while you talk. It requires WebGPU; where WebGPU is
 * unavailable there is no fallback engine — the Voice button renders greyed out
 * with a "Coming soon" reason, up front, instead of looking live and explaining
 * itself on tap. The engine itself lives in @/lib/voice/use-voice-session.
 */

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
  /** A notice from a RUNNING engine that is working but degraded (e.g. it fell
   *  back to CPU). Deliberately NOT the coming-soon reason below: this one means
   *  "it works, just worse", so a surface that greyed a control out on it would
   *  disable a perfectly functional engine. */
  notice?: string | null;
  /** Why the control cannot work here at all, or null when it can. Non-null is
   *  the single shared signal that the mic renders DISABLED inside a
   *  `<ComingSoonNotice reason={comingSoon}>` — set only by the gate, from a
   *  runtime capability probe, so no surface re-derives "unsupported" itself. */
  comingSoon: string | null;
}

/** Dhaga Voice (Moonshine) dictation. WebGPU-only: the real engine is handed
 *  out ONLY once the WebGPU probe confirms an adapter (webgpu === true). While
 *  probing (null) voice is not-ready and start is inert, so a tap can't race the
 *  model loader (which would otherwise hit onnxruntime's "no available backend"
 *  on iOS Safari); when unavailable (false) the state carries `comingSoon` and
 *  the control renders greyed out — no CPU/WASM or browser-engine fallback. See
 *  ./dictation-gate for the pure decision + its tests. */
export function useDictation(onFinalText: (text: string) => void): DictationState {
  // Both hooks run unconditionally (rules-of-hooks) before we gate.
  const moonshine = useVoiceSession(onFinalText);
  const webgpu = useWebGpuAvailable();
  return resolveDictationState(webgpu, moonshine);
}
