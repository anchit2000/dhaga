"use client";

import type { WorkerRequest, WorkerResponse } from "./whisper-protocol";

/**
 * Single shared Worker for on-device Whisper: background model prefetch
 * (Settings/login) AND every actual transcribe call from
 * useLocalWhisper/useRealtimeWhisper. Unified deliberately — a separate
 * warmup-only worker used to leave the real transcribe worker's own
 * pipeline() cold, so a model that was already "ready" per Settings still
 * paid the full inference-session construction cost (not just the
 * network download) on first real recording. One worker means warming it
 * once actually warms the thing that does the work. Module-level
 * singleton: survives across component mounts (Settings, the app shell,
 * the dictation UI) so state is the same one everywhere, for as long as
 * the tab stays open.
 */

export type ModelLoadState =
  | { status: "idle" }
  | { status: "loading"; progress: number }
  | { status: "ready" }
  | { status: "error"; message: string };

const IDLE: ModelLoadState = { status: "idle" };

let worker: Worker | null = null;
let state: ModelLoadState = IDLE;
const listeners = new Set<() => void>();
/** Only one recording engine is ever active at a time, so a single slot
 *  is enough to route a transcribe request's response back to its caller. */
let transcribeListener: ((message: WorkerResponse) => void) | null = null;

function setState(next: ModelLoadState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./whisper-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.status === "loading") setState({ status: "loading", progress: message.progress });
      else if (message.status === "ready") setState({ status: "ready" });
      else if (message.status === "error") setState({ status: "error", message: message.message });
      transcribeListener?.(message);
      if (message.status === "complete" || message.status === "error") transcribeListener = null;
    };
  }
  return worker;
}

/** Idempotent — safe to call on every login/engine-change/mount; a load
 *  already in flight or finished is a no-op. */
export function ensureModelLoaded(): void {
  if (state.status === "loading" || state.status === "ready") return;
  setState({ status: "loading", progress: 0 });
  const request: WorkerRequest = { type: "warmup" };
  getWorker().postMessage(request);
}

/** Terminating the worker aborts whatever fetch (or transcription) is in
 *  flight — there's no byte-range resume, so a later retry restarts that
 *  file's download from scratch. */
export function cancelModelLoad(): void {
  worker?.terminate();
  worker = null;
  transcribeListener = null;
  setState(IDLE);
}

export function retryModelLoad(): void {
  cancelModelLoad();
  ensureModelLoaded();
}

/** Runs one transcribe request on the shared worker — used by both
 *  dictation engines instead of each keeping its own Worker. Transfers
 *  the buffer to avoid copying it across the worker boundary. */
export function transcribe(audio: Float32Array, realtime: boolean, onMessage: (message: WorkerResponse) => void): void {
  transcribeListener = onMessage;
  const request: WorkerRequest = { type: "transcribe", audio, realtime };
  getWorker().postMessage(request, [audio.buffer]);
}

export function subscribeModelLoad(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getModelLoadState(): ModelLoadState {
  return state;
}

export function getModelLoadServerState(): ModelLoadState {
  return IDLE;
}
