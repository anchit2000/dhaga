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
