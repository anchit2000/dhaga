/**
 * Correction/intelligence gateway. Takes the running transcript + the newly
 * finalized utterance and folds them together, applying self-corrections ("no,
 * make it 4"), stripping the corrective phrase itself, cleaning fillers/
 * punctuation, and honoring the user's preferred spellings. A model-backed engine
 * sees ONLY the new utterance (a small chunk); the engine reassembles
 * `workingText` from the corrected chunk + prior transcript. Returns the
 * reassembled transcript + the edits applied to the utterance.
 *
 * The LLM-backed implementation is PARKED — VoiceSession runs teaching-only via
 * NoopCorrectionEngine (./noop). Adding an LLM engine later = a new implementation
 * of this interface, zero changes to callers.
 */
import type { Edit } from "../types";

export interface CorrectionInput {
  /** Committed transcript so far (may be empty for the first utterance). */
  workingText: string;
  /** The new finalized utterance, already phonetic-corrected by the teaching layer. */
  utterance: string;
  /** Canonical spellings the model must use exactly (from the user vocab). */
  preferredSpellings: string[];
  /** Human date line for temporal reasoning, e.g. "Today's date: 2026-07-24". */
  today: string;
}

export interface CorrectionOutput {
  /** Full rewritten working transcript after folding in the utterance. */
  workingText: string;
  /** Verbatim before/after edits with terse reasons. */
  edits: Edit[];
  /** New canonical terms the model inferred the user established (e.g. a spelled-out name). */
  learnedTerms: string[];
}

export interface CorrectionEngine {
  readonly name: string;
  load(onProgress?: (progress: number, message: string) => void): Promise<void>;
  isReady(): boolean;
  /** True when the engine has degraded to deterministic-only cleanup (no live LLM). */
  isDeterministicOnly?(): boolean;
  correct(input: CorrectionInput): Promise<CorrectionOutput>;
  dispose(): Promise<void>;
}
