/**
 * MoonshineAsrEngine — bounded-latency chunked streaming ASR (AsrEngine impl).
 * Audio commits to text in fixed CHUNKs as it arrives (word-level seam dedup), so
 * decode time stays ~constant regardless of length. TINY-ONLY (constants.ts).
 * Loading → loader.ts, pure stream helpers → streaming.ts, rolling PCM window +
 * offset math → frame-buffer.ts. Silence-gated so a dead mic can't hallucinate.
 * CLIENT-ONLY — only import from "use client".
 */
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import type { AsrEngine } from "@dhaga/core/src/voice/asr/types";
import type { LoadProgress, PcmFrame } from "@dhaga/core/src/voice/types";
import type { Backend } from "./constants";
import { CHUNK, OVERLAP, SILENCE_PEAK_THRESHOLD } from "./constants";
import { FrameBuffer } from "./frame-buffer";
import { loadTiny } from "./loader";
import { appendWithOverlapDedup, extractText, isSilent } from "./streaming";

export class MoonshineAsrEngine implements AsrEngine {
  readonly name = "moonshine";

  private _backend: Backend = "wasm";
  private tiny: AutomaticSpeechRecognitionPipeline | null = null;
  private ready = false;

  private readonly buffer = new FrameBuffer();
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
    this.buffer.push(frame);
  }

  async transcribePartial(): Promise<string> {
    // Never run two Moonshine decodes at once — the reference serializes inference.
    if (!this.tiny || this.busy || this.buffer.totalLen === 0) return "";
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
      while (this.buffer.totalLen - this.committedSamples >= CHUNK + OVERLAP) {
        const from = Math.max(0, this.committedSamples - OVERLAP);
        const window = this.buffer.window(from, this.committedSamples + CHUNK);
        // Consume a silent chunk (advance the commit cursor) but decode nothing:
        // a dead/muted mic feeds zeros and Moonshine would hallucinate on them.
        if (!isSilent(window, SILENCE_PEAK_THRESHOLD)) {
          const chunkText = extractText(await tiny(window));
          this.committedText = appendWithOverlapDedup(this.committedText, chunkText);
        }
        this.committedSamples += CHUNK;
        this.buffer.prune(this.committedSamples - OVERLAP);
      }
      const tailFrom = Math.max(0, this.committedSamples - OVERLAP);
      if (this.buffer.totalLen <= tailFrom) return this.committedText.trim();
      const tail = this.buffer.window(tailFrom, this.buffer.totalLen);
      if (isSilent(tail, SILENCE_PEAK_THRESHOLD)) return this.committedText.trim();
      const tailText = extractText(await tiny(tail));
      return appendWithOverlapDedup(this.committedText, tailText).trim();
    } finally {
      this.busy = false;
    }
  }

  async finalize(_boosts?: string[]): Promise<string> {
    // Let any in-flight partial settle, then detach the audio + clear committed
    // state synchronously (before any await) so a NEW utterance's frames land fresh.
    if (this.inflight) {
      try {
        await this.inflight;
      } catch {
        /* a failed partial must not block the final decode */
      }
    }
    const committedText = this.committedText;
    const committedSamples = this.committedSamples;
    const totalLen = this.buffer.totalLen;
    const snapshot = this.buffer.take();
    this.committedText = "";
    this.committedSamples = 0;

    // Moonshine has no hotword API; `boosts` is ignored (teaching biases downstream).
    const tiny = this.tiny;
    if (!tiny) return committedText.trim();
    const from = Math.max(0, committedSamples - OVERLAP);
    if (totalLen <= from) return committedText.trim();

    const tail = snapshot.window(from, totalLen);
    // A silent final tail (dead-air trailer) must not be decoded — return what's
    // already committed rather than let the model hallucinate a closing phrase.
    if (isSilent(tail, SILENCE_PEAK_THRESHOLD)) return committedText.trim();

    this.busy = true;
    const job = tiny(tail);
    this.inflight = job;
    try {
      return appendWithOverlapDedup(committedText, extractText(await job)).trim();
    } finally {
      this.busy = false;
      if (this.inflight === job) this.inflight = null;
    }
  }

  reset(): void {
    this.buffer.reset();
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
