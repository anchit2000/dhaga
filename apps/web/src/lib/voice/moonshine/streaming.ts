/**
 * Pure helpers for the Moonshine streaming engine: text extraction, backend →
 * ONNX device mapping, seam-overlap dedup, and windowed frame slicing. No state,
 * no model, no browser globals — split out of index.ts to keep the engine class
 * within the 150-line rule and to make this logic unit-testable in isolation.
 */
import type { AutomaticSpeechRecognitionOutput } from "@huggingface/transformers";
import type { LoadProgress } from "@dhaga/core/src/voice/types";
import type { Backend, ModelProgress } from "./constants";
import { OVERLAP_DEDUP_WORDS } from "./constants";

export function extractText(
  result: AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[],
): string {
  const first = Array.isArray(result) ? result[0] : result;
  return first?.text ?? "";
}

/**
 * Fold one transformers.js per-file progress event into `bytesByFile` and return
 * the combined 0..1 LoadProgress across every file seen so far, or null for
 * non-progress events. The map is mutated in place (the engine owns it).
 */
export function aggregateProgress(
  bytesByFile: Map<string, { loaded: number; total: number }>,
  modelName: string,
  info: ModelProgress,
): LoadProgress | null {
  if (
    info.status !== "progress" ||
    info.file === undefined ||
    info.loaded === undefined ||
    info.total === undefined
  ) {
    return null;
  }
  // Model-qualified key so per-file bytes aggregate cleanly (only tiny loads now).
  bytesByFile.set(`${modelName}:${info.file}`, { loaded: info.loaded, total: info.total });
  let loaded = 0;
  let total = 0;
  for (const entry of bytesByFile.values()) {
    loaded += entry.loaded;
    total += entry.total;
  }
  return { file: info.file, loaded, total, progress: total > 0 ? loaded / total : 0 };
}

/**
 * ONNX execution provider for a given fallback backend. Browser behavior is
 * unchanged; only under Node (a headless harness) does the WASM fallback map to
 * the CPU provider, because the transformers.js Node build ships no WASM
 * execution provider. `process.versions.node` is undefined in browsers, so this
 * branch never fires in production.
 */
export function onnxDevice(backend: Backend): Backend | "cpu" {
  const isNode = typeof process !== "undefined" && Boolean(process.versions?.node);
  return backend === "wasm" && isNode ? "cpu" : backend;
}

/** Lowercased, punctuation-stripped form used only for seam-overlap comparison. */
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** True if two equal-length word runs are the same after normalization. */
function wordsMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (normalizeWord(a[i]) !== normalizeWord(b[i])) return false;
  }
  return true;
}

/**
 * Concatenate `next` onto `prev`, dropping the duplicated run at the seam. Each
 * chunk re-decodes ~OVERLAP of already-committed audio, so `next`'s leading
 * words repeat `prev`'s trailing words. Compare up to the last ~6 words of `prev`
 * with the first ~6 of `next` (normalized for casing/punctuation), drop the
 * longest matching prefix of `next`, and keep the original casing. Only a
 * contiguous overlap at the seam is removed — repeats elsewhere are left intact.
 */
export function appendWithOverlapDedup(prev: string, next: string): string {
  const nextTrimmed = next.trim();
  if (!nextTrimmed) return prev.trim();
  const prevTrimmed = prev.trim();
  if (!prevTrimmed) return nextTrimmed;

  const prevWords = prevTrimmed.split(/\s+/);
  const nextWords = nextTrimmed.split(/\s+/);
  const maxOverlap = Math.min(OVERLAP_DEDUP_WORDS, prevWords.length, nextWords.length);

  let overlap = 0;
  for (let k = maxOverlap; k >= 1; k--) {
    if (wordsMatch(prevWords.slice(prevWords.length - k), nextWords.slice(0, k))) {
      overlap = k;
      break;
    }
  }
  const remainder = nextWords.slice(overlap).join(" ");
  return remainder ? `${prevTrimmed} ${remainder}` : prevTrimmed;
}

/**
 * Copy the half-open sample range `[from, to)` out of the frame buffer without
 * concatenating the whole thing — only the requested window is materialized.
 */
export function sliceRange(chunks: Float32Array[], from: number, to: number): Float32Array {
  const start = Math.max(0, from);
  const end = Math.max(start, to);
  const out = new Float32Array(end - start);
  let pos = 0;
  let written = 0;
  for (const chunk of chunks) {
    if (written >= out.length) break;
    const chunkStart = pos;
    const chunkEnd = pos + chunk.length;
    pos = chunkEnd;
    if (chunkEnd <= start) continue; // entirely before the window
    if (chunkStart >= end) break; // entirely after the window
    const localStart = Math.max(start, chunkStart) - chunkStart;
    const localEnd = Math.min(end, chunkEnd) - chunkStart;
    out.set(chunk.subarray(localStart, localEnd), written);
    written += localEnd - localStart;
  }
  return written === out.length ? out : out.subarray(0, written);
}
