/**
 * Web Worker: on-device speech-to-text via transformers.js + Whisper base.
 * Runs off the main thread so model load/inference never blocks the UI.
 * Model + weights are cached by the browser after the first download
 * (transformers.js uses the Cache API / IndexedDB automatically). Shared by
 * both dictation engines (batch and real-time) — same model, same cache,
 * only the generation options per-request differ.
 */

import type { WorkerRequest, WorkerResponse } from "./whisper-protocol";

const MODEL_ID = "onnx-community/whisper-base";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transcriber = (audio: Float32Array, options?: Record<string, unknown>) => Promise<any>;

let transcriberPromise: Promise<Transcriber> | null = null;

function post(message: WorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}

/** Lazy + memoized: the ~40MB (q8) model only downloads once the user
 *  actually opts into an on-device engine, never on worker creation. */
function getTranscriber(): Promise<Transcriber> {
  transcriberPromise ??= import("@huggingface/transformers").then(async ({ pipeline }) => {
    // Track the single largest-known total so multi-file progress reads as
    // one steady percentage instead of jumping between files.
    let lastPercent = 0;
    const progress_callback = (event: { status: string; progress?: number }) => {
      if (event.status === "progress" && typeof event.progress === "number") {
        lastPercent = Math.max(lastPercent, Math.round(event.progress));
        post({ status: "loading", progress: lastPercent });
      }
    };

    const hasWebGPU = Boolean((self as unknown as { navigator?: { gpu?: unknown } }).navigator?.gpu);
    try {
      return await pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "q8",
        device: hasWebGPU ? "webgpu" : undefined,
        progress_callback,
      });
    } catch {
      // WebGPU adapter request can fail even when navigator.gpu exists
      // (blocklisted GPU, out of memory, disabled by policy) — retry on the
      // universally-supported wasm backend rather than failing outright.
      return pipeline("automatic-speech-recognition", MODEL_ID, {
        dtype: "q8",
        progress_callback,
      });
    }
  });
  return transcriberPromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "warmup") {
    try {
      await getTranscriber();
      post({ status: "ready" });
    } catch (error) {
      post({ status: "error", message: error instanceof Error ? error.message : "Model load failed." });
    }
    return;
  }
  if (event.data.type !== "transcribe") return;
  try {
    const transcriber = await getTranscriber();
    post({ status: "ready" });
    // Real-time passes re-transcribe a short rolling buffer many times a
    // second, so they skip the long-clip chunking and cap generated tokens
    // to stay fast; batch passes get the full chunk/stride treatment since
    // they only run once, after the user stops.
    const result = await transcriber(
      event.data.audio,
      event.data.realtime ? { max_new_tokens: 64 } : { chunk_length_s: 30, stride_length_s: 5 },
    );
    const text = Array.isArray(result) ? result.map((r) => r.text).join(" ") : result.text;
    post({ status: "complete", text: (text ?? "").trim() });
  } catch (error) {
    post({ status: "error", message: error instanceof Error ? error.message : "Transcription failed." });
  }
};
