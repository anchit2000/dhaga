/** Alphanumeric words (>=3 chars) from a free-text query — the same
 *  tokenization feeds every keyword source: tsquery construction, trigram
 *  fragment checks, and the plain-substring snippet lookups. */
export function queryWords(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 3),
    ),
  ];
}

/**
 * Builds a `to_tsquery`-ready expression: every word is prefix-matched
 * (`:*`) so a still-being-typed word matches live, and words are OR'd — not
 * AND'd — to keep hybridSearch's recall-first scoring model, where a
 * partial keyword overlap bumps a contact's score rather than being
 * required to match every word. Safe to interpolate as a bound parameter:
 * `queryWords` already restricts words to `\p{L}\p{N}`, so none can contain
 * tsquery syntax characters.
 */
export function buildTsQuery(words: string[]): string {
  return words.map((word) => `${word}:*`).join(" | ");
}
