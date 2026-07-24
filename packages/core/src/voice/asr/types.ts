/**
 * ASR gateway — the pluggable STT engine contract. A concrete engine accumulates
 * audio for the *current* utterance internally, yields a rolling live partial on
 * demand, and produces an accurate final on finalize().
 *
 * Adding a new engine (e.g. a server backend later) = implement this interface;
 * zero changes to callers.
 */
import type { PcmFrame, LoadProgress } from "../types";

export interface AsrEngine {
  readonly name: string;

  /** Download + compile the model(s). Idempotent. */
  load(onProgress?: (p: LoadProgress) => void): Promise<void>;
  isReady(): boolean;

  /** Whether WebGPU was obtained (false ⇒ running the WASM fallback). */
  readonly backend: "webgpu" | "wasm";

  /** Append one frame of 16 kHz mono audio to the current utterance buffer. */
  pushFrame(frame: PcmFrame): void;

  /**
   * Fast, low-latency hypothesis for everything spoken in the current utterance
   * so far. Called on a cadence while the user talks. May use a smaller/faster
   * model than finalize(). Returns "" if nothing decodable yet.
   */
  transcribePartial(): Promise<string>;

  /**
   * Accurate full-context decode of the completed utterance, then clears the
   * utterance buffer. `boosts` are preferred terms (word-boosting / hotwords)
   * where the backend supports it.
   */
  finalize(boosts?: string[]): Promise<string>;

  /** Drop the current utterance buffer without decoding. */
  reset(): void;

  dispose(): Promise<void>;
}
