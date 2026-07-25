/**
 * Pronoun subjects an extraction can emit. A pronoun names no contact, so a
 * relationship whose subject is one is never silently attributed to the note's
 * own contact — it defers to a subject_resolution confirmation instead. Matched
 * case-insensitively against the trimmed subject.
 */
export const SUBJECT_PRONOUNS: readonly string[] = [
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
  "we",
  "us",
  "our",
  "ours",
  "i",
  "me",
  "my",
  "mine",
  "you",
  "your",
  "yours",
  "it",
  "its",
];

/**
 * A relationship object that opens with a third-person possessive ("his son",
 * "her manager", "their lead") is a bare reference to someone the note never
 * names. resolveObject treats it as a note-scoped placeholder and relabels it
 * off the note's subject ("his son" on Prashant ⇒ "Prashant's son") rather than
 * minting a contact literally called "his son". First-person possessives ("my",
 * "our") are deliberately excluded — they point at the note's author, not the
 * subject — so they stay on the normal path.
 */
export const THIRD_PERSON_POSSESSIVE = /^(his|her|their|hers)\s+\w/i;

/** Strips a leading third-person possessive to recover the relation noun
 *  ("his son" → "son"); the detection form above additionally requires a
 *  following word char so a lone "his " never matches. */
export const LEADING_POSSESSIVE = /^(his|her|their|hers)\s+/i;
