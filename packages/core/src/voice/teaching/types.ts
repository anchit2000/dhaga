/**
 * Teaching layer contracts. This is the deterministic, $0-token half of
 * personalization (Rule 5: code answers deterministic transforms). It catches
 * known-vocabulary mistakes instantly and learns from the user's own edits,
 * independent of whichever ASR backend is running.
 */
import type { Edit, VocabTerm } from "../types";

/** A phonetic index over the user's vocabulary that rewrites mis-transcriptions. */
export interface PhoneticDictionary {
  /** Rebuild the index from the current vocab set. */
  rebuild(terms: VocabTerm[]): void;
  /**
   * Scan `text`, replace phonetic matches of any vocab term (single- or
   * multi-token aliases) with the canonical spelling. Returns the corrected
   * text and the edits applied (empty if none).
   */
  correct(text: string): { text: string; edits: Edit[] };
}

/** Per-user vocabulary persisted by the platform (survives reloads, fully local). */
export interface VocabStore {
  load(): Promise<VocabTerm[]>;
  /** Add or merge a canonical term with optional observed mis-spellings. */
  upsert(term: string, aliases?: string[], boost?: number): Promise<VocabTerm>;
  remove(term: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Watches the diffs the user makes to committed text and decides which are worth
 * learning as vocab (proper nouns / distinctive terms), filtering common words.
 */
export interface EditWatcher {
  /** Given an original→edited pair, return canonical terms worth teaching. */
  candidates(before: string, after: string): string[];
}
