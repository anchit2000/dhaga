"use client";

import type { WorkerRequest, WorkerResponse } from "./whisper-protocol";

/**
 * Background prefetch for the on-device Whisper model, independent of the
 * per-recording workers in useLocalWhisper/useRealtimeWhisper. Runs in its
 * own Worker so it shares the browser's Cache API storage with them (a
 * later transcribe-time pipeline() call reuses whatever this already
 * fetched) without unifying the worker instances themselves. Module-level
 * singleton: survives across component mounts (Settings, the app shell,
 * the dictation UI) so the download and its progress are the same one
 * everywhere, for as long as the tab stays open.
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

/** Terminating the worker aborts whatever fetch is in flight — there's no
 *  byte-range resume, so a later retry restarts that file's download. */
export function cancelModelLoad(): void {
  worker?.terminate();
  worker = null;
  setState(IDLE);
}

export function retryModelLoad(): void {
  cancelModelLoad();
  ensureModelLoaded();
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
