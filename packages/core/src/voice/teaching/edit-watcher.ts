/**
 * Learns vocabulary from the corrections the user makes to committed text
 * (Wispr-style auto-learn). When someone fixes "ankit" → "Anchit" by hand, the
 * word they *added* is almost always a proper noun the ASR keeps missing — worth
 * teaching. The heuristic is deliberately conservative: a false positive
 * pollutes the dictionary and causes future over-corrections, so we bias hard
 * toward silence, filtering short tokens, numbers, and common English words.
 */
import type { EditWatcher } from "./types";
import { COMMON_WORDS, MIN_LEARNABLE_LENGTH } from "./constants";

export class HeuristicEditWatcher implements EditWatcher {
  candidates(before: string, after: string): string[] {
    const beforeTokens = new Set(this.tokens(before).map((t) => t.toLowerCase()));
    const seen = new Set<string>();
    const learned: string[] = [];

    for (const token of this.tokens(after)) {
      const lower = token.toLowerCase();
      if (beforeTokens.has(lower)) continue; // unchanged word, not a correction
      if (seen.has(lower)) continue; // already captured
      if (token.length < MIN_LEARNABLE_LENGTH) continue; // too short to be distinctive
      if (/^\d+$/.test(token)) continue; // pure number
      if (COMMON_WORDS.has(lower)) continue; // ordinary English word
      seen.add(lower);
      learned.push(token); // keep original casing — proper nouns are capitalized
    }
    return learned;
  }

  /** Word/number tokens, casing preserved for the caller. */
  private tokens(text: string): string[] {
    return text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*/g) ?? [];
  }
}
