/**
 * MoonshineAsrEngine — the AsrEngine implementation. Bounded-latency chunked
 * streaming: audio is committed to text in fixed CHUNKs as it arrives (folded
 * via a word-level seam dedup), so per-call decode time stays roughly constant
 * regardless of utterance length. TINY-ONLY hot path (see constants.ts). Model
 * loading (dynamic import + WebGPU→WASM fallback) lives in loader.ts; the pure
 * streaming helpers in streaming.ts. CLIENT-ONLY — only import from "use client".
 */
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import type { AsrEngine } from "@dhaga/core/src/voice/asr/types";
import type { LoadProgress, PcmFrame } from "@dhaga/core/src/voice/types";
import type { Backend } from "./constants";
import { CHUNK, OVERLAP } from "./constants";
import { loadTiny } from "./loader";
import { appendWithOverlapDedup, extractText, sliceRange } from "./streaming";

export class MoonshineAsrEngine implements AsrEngine {
  readonly name = "moonshine";

  private _backend: Backend = "wasm";
  private tiny: AutomaticSpeechRecognitionPipeline | null = null;
  private ready = false;

  private chunks: Float32Array[] = [];
  private totalLen = 0;
  /** Accurate text for audio already folded in, and how many samples that covers. */
  private committedText = "";
  private committedSamples = 0;
  private busy = false;
  private inflight: Promise<unknown> | null = null;

  private readonly bytesByFile = new Map<string, { loaded: number; total: number }>();

  get backend(): Backend {
    return this._backend;
  }

  isReady(): boolean {
    return this.ready;
  }

  async load(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.ready) return;
    const { pipeline, backend } = await loadTiny(this.bytesByFile, onProgress);
    this.tiny = pipeline;
    this._backend = backend;
    this.ready = true;
  }

  pushFrame(frame: PcmFrame): void {
    if (frame.length === 0) return;
    this.chunks.push(frame);
    this.totalLen += frame.length;
  }

  async transcribePartial(): Promise<string> {
    // Never run two Moonshine decodes at once — the reference serializes inference.
    if (!this.tiny || this.busy || this.totalLen === 0) return "";
    const job = this.runPartial();
    this.inflight = job;
    try {
      return await job;
    } finally {
      if (this.inflight === job) this.inflight = null;
    }
  }

  /** Commit whole chunks (tiny model), then decode the short pending tail. Never
   *  decodes more than ~CHUNK+OVERLAP of audio in any single decode. */
  private async runPartial(): Promise<string> {
    const tiny = this.tiny;
    if (!tiny) return "";
    this.busy = true;
    try {
      while (this.totalLen - this.committedSamples >= CHUNK + OVERLAP) {
        const from = Math.max(0, this.committedSamples - OVERLAP);
        const to = this.committedSamples + CHUNK;
        const chunkText = extractText(await tiny(sliceRange(this.chunks, from, to)));
        this.committedText = appendWithOverlapDedup(this.committedText, chunkText);
        this.committedSamples += CHUNK;
      }
      const tailFrom = Math.max(0, this.committedSamples - OVERLAP);
      if (this.totalLen <= tailFrom) return this.committedText.trim();
      const tailText = extractText(await tiny(sliceRange(this.chunks, tailFrom, this.totalLen)));
      return appendWithOverlapDedup(this.committedText, tailText).trim();
    } finally {
      this.busy = false;
    }
  }

  async finalize(_boosts?: string[]): Promise<string> {
    // Let any in-flight partial finish so committed state is settled, then
    // snapshot + clear synchronously (before any await) so frames from a NEW
    // utterance started during the flush land in a fresh buffer, not this one.
    if (this.inflight) {
      try {
        await this.inflight;
      } catch {
        /* a failed partial must not block the final decode */
      }
    }
    const chunks = this.chunks;
    const totalLen = this.totalLen;
    const committedText = this.committedText;
    const committedSamples = this.committedSamples;
    this.reset();

    // Moonshine has no hotword/boost API; `boosts` is ignored (the phonetic
    // teaching layer applies term biasing downstream).
    const tiny = this.tiny;
    if (!tiny) return committedText.trim();
    const from = Math.max(0, committedSamples - OVERLAP);
    if (totalLen <= from) return committedText.trim();

    this.busy = true;
    const job = tiny(sliceRange(chunks, from, totalLen));
    this.inflight = job;
    try {
      return appendWithOverlapDedup(committedText, extractText(await job)).trim();
    } finally {
      this.busy = false;
      if (this.inflight === job) this.inflight = null;
    }
  }

  reset(): void {
    this.chunks = [];
    this.totalLen = 0;
    this.committedText = "";
    this.committedSamples = 0;
  }

  async dispose(): Promise<void> {
    const job = this.tiny?.dispose();
    this.tiny = null;
    await job;
    this.bytesByFile.clear();
    this.ready = false;
    this.reset();
  }
}
