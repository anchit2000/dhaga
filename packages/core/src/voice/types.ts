/**
 * Core domain types shared across every layer of the voice pipeline.
 *
 * Deep-import-only (`@dhaga/core/src/voice/...`): pure TS, no browser globals,
 * Hermes/mobile-safe. Deliberately NOT re-exported from the package root barrel
 * (src/index.ts) — that barrel pulls in the Anthropic SDK + zod, which breaks the
 * mobile Hermes runtime. Mirrors geo/geohash.ts and capture/linkedin-qr.ts.
 *
 * Data flow:  audio → PcmFrame → ASR → raw text → phonetic teaching → correction
 * → SessionEvent stream that the UI renders.
 */

/** 16 kHz mono float32 audio, the contract every stage speaks. */
export type PcmFrame = Float32Array;

export const SAMPLE_RATE = 16000;

/** A single applied rewrite: verbatim before/after plus a terse (<=6 word) reason. */
export interface Edit {
  before: string;
  after: string;
  reason: string;
}

/**
 * A term the user has taught the system to spell/recognize a specific way.
 * `keys` are precomputed phonetic codes (double-metaphone) for fuzzy matching.
 */
export interface VocabTerm {
  /** Canonical spelling, e.g. "Anchit". */
  term: string;
  /** Extra surface forms the user has seen it mis-transcribed as, e.g. ["An chit", "Ankit"]. */
  aliases: string[];
  /** Phonetic codes for `term` + each alias; the lookup index. */
  keys: string[];
  /** Decoder/LLM biasing weight. */
  boost: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Events emitted by a VoiceSession as an utterance progresses. The UI is a pure
 * function of this stream.
 */
export type SessionEvent =
  | { type: "partial"; text: string }
  | { type: "final"; text: string; raw: string }
  | { type: "edit_applied"; workingText: string; edits: Edit[] }
  | { type: "learned"; terms: string[] }
  | { type: "status"; stage: LoadStage; detail?: string; progress?: number }
  | { type: "error"; message: string };

export type LoadStage =
  | "idle"
  | "loading-asr"
  | "loading-llm"
  | "ready"
  | "listening"
  | "transcribing"
  | "refining"
  | "correcting";

export type EventSink = (event: SessionEvent) => void;

/** Progress callback shape used by every loadable component. */
export interface LoadProgress {
  file: string;
  loaded: number;
  total: number;
  /** 0..1 */
  progress: number;
}
