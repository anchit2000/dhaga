/**
 * Deterministic phonetic teaching (Rule 5: code answers deterministic
 * transforms). Double Metaphone maps sound-alike spellings to the same code, so
 * a name the user taught ("Anchit") is recovered no matter how the ASR spelled
 * it ("An chit", "Ankit", "Aunchit") — instantly, with zero tokens.
 *
 * Key idea for multi-word aliases: compute the code *per word* and concatenate
 * with no separator. "an" + "chit" → "AN"+"XT" = "ANXT", the same code Double
 * Metaphone gives the single word "anchit". That cross-word equivalence is why
 * a two-token mis-transcription collapses onto the one-token canonical spelling.
 */
import { doubleMetaphone } from "double-metaphone";
import type { PhoneticDictionary } from "./types";
import type { Edit, VocabTerm } from "../types";

/** Longest alias (in words) we will try to match against a single vocab term. */
const MAX_WINDOW = 3;

/** Split a term into lowercase word tokens; punctuation/whitespace are ignored. */
function words(term: string): string[] {
  return term.toLowerCase().match(/[a-z]+(?:'[a-z]+)*/g) ?? [];
}

/**
 * 1–2 phonetic keys for a possibly multi-word term. Per word we take Double
 * Metaphone's [primary, secondary]; the term's primary key is every word's
 * primary joined, likewise for secondary. Deduped, so a word whose two codes
 * agree yields a single key.
 */
export function phoneticKeys(term: string): string[] {
  const tokens = words(term);
  if (tokens.length === 0) return [];
  const primaries: string[] = [];
  const secondaries: string[] = [];
  for (const w of tokens) {
    const [primary, secondary] = doubleMetaphone(w);
    primaries.push(primary);
    secondaries.push(secondary);
  }
  const keys = new Set<string>();
  const primaryKey = primaries.join("");
  const secondaryKey = secondaries.join("");
  if (primaryKey) keys.add(primaryKey);
  if (secondaryKey) keys.add(secondaryKey);
  return [...keys];
}

/** A word occurrence in the source text, with its span for in-place rewrites. */
interface WordSpan {
  start: number;
  end: number;
}

export class DoubleMetaphoneDictionary implements PhoneticDictionary {
  /** phonetic key → the canonical term that owns it. First writer wins. */
  private index = new Map<string, VocabTerm>();

  rebuild(terms: VocabTerm[]): void {
    this.index = new Map();
    for (const term of terms) {
      // Trust the stored keys, but recompute from term + aliases defensively so
      // a stale/empty `keys` array can never silently disable a taught term.
      const keys = new Set<string>(term.keys);
      for (const k of phoneticKeys(term.term)) keys.add(k);
      for (const alias of term.aliases) {
        for (const k of phoneticKeys(alias)) keys.add(k);
      }
      for (const key of keys) {
        if (!this.index.has(key)) this.index.set(key, term);
      }
    }
  }

  correct(text: string): { text: string; edits: Edit[] } {
    if (this.index.size === 0) return { text, edits: [] };

    const spans: WordSpan[] = [];
    const re = /[A-Za-z]+(?:'[A-Za-z]+)*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length });
    }

    const edits: Edit[] = [];
    const rewrites: Array<{ start: number; end: number; after: string }> = [];

    // Left to right, longest window first. On a hit we jump past the whole
    // window so overlapping spans are never double-corrected.
    let i = 0;
    while (i < spans.length) {
      let matchedLen = 0;
      const maxLen = Math.min(MAX_WINDOW, spans.length - i);
      for (let len = maxLen; len >= 1; len--) {
        const start = spans[i].start;
        const end = spans[i + len - 1].end;
        const surface = text.slice(start, end);
        const canonical = this.lookup(surface);
        // Guard: rewrite only when the window (a) phonetically matches a TAUGHT
        // term and (b) is not already spelled canonically. Untaught words never
        // reach here, so ordinary prose is left untouched.
        if (canonical !== null && canonical !== surface) {
          rewrites.push({ start, end, after: canonical });
          edits.push({ before: surface, after: canonical, reason: "taught spelling" });
          matchedLen = len;
          break;
        }
      }
      i += matchedLen > 0 ? matchedLen : 1;
    }

    if (rewrites.length === 0) return { text, edits: [] };

    // Apply right to left so earlier spans keep their original offsets.
    let out = text;
    for (let r = rewrites.length - 1; r >= 0; r--) {
      const { start, end, after } = rewrites[r];
      out = out.slice(0, start) + after + out.slice(end);
    }
    return { text: out, edits };
  }

  /** Canonical spelling for a window's phonetics, or null if nothing taught. */
  private lookup(surface: string): string | null {
    for (const key of phoneticKeys(surface)) {
      const term = this.index.get(key);
      if (term) return term.term;
    }
    return null;
  }
}
