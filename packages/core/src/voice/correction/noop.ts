/**
 * NoopCorrectionEngine — a pure passthrough that lets VoiceSession run in
 * teaching-only mode with NO LLM. The finalized utterance is folded into the
 * running transcript verbatim; it applies no edits and learns no terms.
 *
 * This is the default correction engine: LLM correction is PARKED (Rule 2 —
 * ship the deterministic half, add the model later behind the same interface).
 * `isReady()` is false so the session never announces a "correcting" stage, and
 * `isDeterministicOnly()` advertises that there is no live model behind it.
 */
import type { CorrectionEngine, CorrectionInput, CorrectionOutput } from "./types";

export class NoopCorrectionEngine implements CorrectionEngine {
  readonly name = "noop";

  async load(): Promise<void> {
    // No model to download or compile — teaching-only mode is ready immediately.
  }

  isReady(): boolean {
    return false;
  }

  isDeterministicOnly(): boolean {
    return true;
  }

  async correct(input: CorrectionInput): Promise<CorrectionOutput> {
    const workingText = input.workingText
      ? `${input.workingText} ${input.utterance}`.trim()
      : input.utterance.trim();
    return { workingText, edits: [], learnedTerms: [] };
  }

  async dispose(): Promise<void> {
    // Nothing to release.
  }
}
