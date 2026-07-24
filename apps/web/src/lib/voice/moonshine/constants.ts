/**
 * Tuning constants and internal type aliases for the Moonshine streaming ASR
 * engine. Split out of index.ts so the engine class stays within the 150-line
 * rule; index.ts re-exports nothing from here (internal to the engine).
 */
import { SAMPLE_RATE } from "@dhaga/core/src/voice/types";

/** WebGPU when available, WASM (same tiny model, on CPU) as the fallback. */
export type Backend = "webgpu" | "wasm";
export type SubmodelDtype = "fp32" | "fp16" | "q8" | "q4";

export const TINY_MODEL = "onnx-community/moonshine-tiny-ONNX";

/** Audio committed per chunk, and the re-decoded lead-in that straddles each seam. */
const CHUNK_S = 5;
const OVERLAP_S = 0.5;
export const CHUNK = SAMPLE_RATE * CHUNK_S; // 80000 @ 16 kHz
export const OVERLAP = SAMPLE_RATE * OVERLAP_S; // 8000 @ 16 kHz

/** How many words at the seam to consider when de-duplicating the re-decoded overlap. */
export const OVERLAP_DEDUP_WORDS = 6;

/**
 * Precision follows the transformers.js `moonshine-web` example: an fp32 encoder
 * plus a quantized decoder (q4 on WebGPU, q8 on WASM) to keep the autoregressive
 * decode loop fast.
 */
export const DTYPE_BY_DEVICE: Record<Backend, Record<string, SubmodelDtype>> = {
  webgpu: { encoder_model: "fp32", decoder_model_merged: "q4" },
  wasm: { encoder_model: "fp32", decoder_model_merged: "q8" },
};

/** Structural view of transformers.js ProgressInfo — only the fields we forward. */
export interface ModelProgress {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}
