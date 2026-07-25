import { EXTRACTION_BLOCKED_LABEL } from "@/utils/constants/extraction-jobs";
import { AiBudgetError } from "../metering";

/** "note": the user's own words (trusted). "enrichment": public-web findings
 *  (extracted broadly, then written unverified for the user to confirm). */
export type ExtractionMode = "note" | "enrichment";

export interface NoteExtractionOutcome {
  applied: boolean;
  /** True only when extraction genuinely errored (AI call or graph write) —
   *  distinct from "ran fine, found nothing" and from "no LLM configured".
   *  The background worker marks the job errored (and retryable) on this. */
  failed: boolean;
  /** True when the monthly AI budget (cap) blocked extraction — a calm terminal
   *  state, NOT an error. The note is saved; automatic extraction is a paid
   *  feature. The worker marks the job "blocked" (non-retryable) on this, so it
   *  is deliberately distinct from `failed` (which offers a Retry). */
  blocked?: boolean;
  factCount: number;
  followUpCount: number;
  notice?: string;
}

/** No LLM provider configured: the note is already saved, extraction is simply
 *  skipped. Neither a failure nor a budget block. */
export function noLlmOutcome(): NoteExtractionOutcome {
  return {
    applied: false,
    failed: false,
    factCount: 0,
    followUpCount: 0,
    notice:
      "Note saved. Configure an LLM provider to extract facts automatically.",
  };
}

/**
 * Map an LLM-phase error to a terminal outcome. The monthly cap ("cap") is a
 * budget wall, not a failure — return a non-retryable blocked outcome so the
 * note is kept and the UI shows a calm paid-feature notice. Burst ("burst") and
 * every other error stay retryable.
 */
export function mapExtractionError(error: unknown): NoteExtractionOutcome {
  if (error instanceof AiBudgetError && error.kind === "cap") {
    return {
      applied: false,
      failed: false,
      blocked: true,
      factCount: 0,
      followUpCount: 0,
      notice: EXTRACTION_BLOCKED_LABEL,
    };
  }
  const reason =
    error instanceof AiBudgetError ? error.message : "The AI call failed.";
  return {
    applied: false,
    failed: true,
    factCount: 0,
    followUpCount: 0,
    notice: `Facts were not extracted: ${reason}`,
  };
}

/** The AI call succeeded but writing the extracted graph failed — a retryable
 *  failure kept distinct from an AI-call failure so it doesn't blame the wrong
 *  layer. The caller logs the real cause (never the note text or contact PII). */
export function graphWriteFailedOutcome(): NoteExtractionOutcome {
  return {
    applied: false,
    failed: true,
    factCount: 0,
    followUpCount: 0,
    notice: "Facts were extracted, but saving them to the graph failed.",
  };
}
