import type { SearchIndexResult } from "@dhaga/core";

/** How the client should present a `notice`: an amber upgrade nudge, an amber
 *  retry cue, a red genuine-failure, or (absent) neutral info. */
export type AiAnswerKind = "upgrade" | "retry" | "error" | "info";

export interface AiAnswerResult {
  answer?: string;
  notice?: string;
  kind?: AiAnswerKind;
  /** Keyword/semantic matches surfaced when the reasoned answer is unavailable
   *  because the monthly AI cap is reached (local search is free/unmetered). */
  hits?: SearchIndexResult[];
}

/** A source contact surfaced beneath a reasoned answer — the receipt. */
export interface SearchReceipt {
  id: string;
  label: string;
  sublabel?: string | null;
}

/**
 * One NDJSON event from `streamSearchAnswer`. Steps and receipts are derived
 * deterministically from real pipeline state — code, never model output
 * (CLAUDE.md Rule 5); only `answer` deltas come from the LLM. A single
 * `notice` reuses aiFailureResult's cap/burst/transient/error discrimination
 * and ends the stream.
 */
export type SearchStreamEvent =
  | { type: "step"; label: string }
  | { type: "answer"; delta: string }
  | { type: "receipts"; items: SearchReceipt[] }
  | { type: "notice"; message: string; kind?: AiAnswerKind; hits?: SearchIndexResult[] }
  | { type: "done" };
