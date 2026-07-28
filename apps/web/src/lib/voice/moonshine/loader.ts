/**
 * Model loading for the Moonshine engine: dynamic transformers.js import,
 * WebGPU→WASM fallback, and warm-up. Split out of engine.ts to keep the engine
 * class within the 150-line rule.
 *
 * The transformers.js import is dynamic (`await import`) so the onnxruntime
 * server bundle is never pulled into a route's build — the whole reason this
 * engine is client-only.
 */
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { SAMPLE_RATE, type LoadProgress } from "@dhaga/core/src/voice/types";
import { isWebGpuObjectPresent } from "@/lib/voice/capability";
import type { Backend, ModelProgress } from "./constants";
import { DTYPE_BY_DEVICE, TINY_MODEL } from "./constants";
import { aggregateProgress, onnxDevice } from "./streaming";

type PipelineFn = (typeof import("@huggingface/transformers"))["pipeline"];
type BytesByFile = Map<string, { loaded: number; total: number }>;

export interface LoadedModel {
  pipeline: AutomaticSpeechRecognitionPipeline;
  backend: Backend;
}

function progressCallback(
  bytesByFile: BytesByFile,
  onProgress?: (p: LoadProgress) => void,
): (info: ModelProgress) => void {
  return (info: ModelProgress): void => {
    const p = aggregateProgress(bytesByFile, TINY_MODEL, info);
    if (p) onProgress?.(p);
  };
}

/** Load + warm the tiny model on one device. Disposes the session and rethrows
 *  on failure so loadTiny() can fall back without leaking WebGPU memory. */
async function loadOn(
  device: Backend,
  pipeline: PipelineFn,
  bytesByFile: BytesByFile,
  onProgress?: (p: LoadProgress) => void,
): Promise<AutomaticSpeechRecognitionPipeline> {
  // Destructure out of a (single-element) Promise.all: the tuple context keeps
  // transformers.js's giant `pipeline()` return union representable (TS2590).
  const [tiny] = await Promise.all([
    pipeline("automatic-speech-recognition", TINY_MODEL, {
      device: onnxDevice(device),
      dtype: DTYPE_BY_DEVICE[device],
      progress_callback: progressCallback(bytesByFile, onProgress),
    }),
  ]);
  try {
    // Warm up (compiles WebGPU shaders / primes the WASM sessions). A throw here
    // — e.g. an unusable WebGPU adapter — propagates so we can fall back. Dispose
    // the constructed session first so the fallback doesn't inherit orphaned
    // WebGPU memory.
    await tiny(new Float32Array(SAMPLE_RATE));
  } catch (err) {
    await tiny.dispose();
    throw err;
  }
  return tiny;
}

/**
 * Load the tiny Moonshine model. WebGPU is REQUIRED: callers (useDictation) only
 * reach here after a WebGPU adapter is confirmed, and we guard again so a model
 * load can never fall through to onnxruntime's WASM backend on a device without
 * WebGPU (e.g. iOS Safari), where it throws an opaque "no available backend".
 * The WASM branch below is kept only as a same-device fallback for the rare case
 * where a *confirmed* adapter still fails to initialize — never for absent gpu.
 */
export async function loadTiny(
  bytesByFile: BytesByFile,
  onProgress?: (p: LoadProgress) => void,
): Promise<LoadedModel> {
  if (!isWebGpuObjectPresent()) {
    throw new Error("Voice needs a browser with WebGPU — none is available here.");
  }
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;

  try {
    return { pipeline: await loadOn("webgpu", pipeline, bytesByFile, onProgress), backend: "webgpu" };
  } catch (err) {
    console.warn("WebGPU ASR init failed; falling back to WASM.", err);
    bytesByFile.clear();
  }
  return { pipeline: await loadOn("wasm", pipeline, bytesByFile, onProgress), backend: "wasm" };
}
