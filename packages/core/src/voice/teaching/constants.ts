/**
 * Teaching-layer constants. Per CLAUDE.md's file-organization rule, fixed
 * values live in a constants module rather than inline in the logic file — the
 * source kept COMMON_WORDS inline; it is lifted here on port.
 */

/** Minimum length for a token to be considered distinctive enough to learn. */
export const MIN_LEARNABLE_LENGTH = 3;

/**
 * ~200 of the most frequent English words. Anything here is assumed to be
 * ordinary prose the user rearranged, not a name they taught. Compact on
 * purpose: the goal is to reject filler, not to be a dictionary.
 */
export const COMMON_WORDS: ReadonlySet<string> = new Set<string>([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
  "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its",
  "let", "put", "say", "she", "too", "use", "that", "with", "have", "this",
  "will", "your", "from", "they", "know", "want", "been", "good", "much",
  "some", "time", "very", "when", "come", "here", "just", "like", "long",
  "make", "many", "over", "such", "take", "than", "them", "well", "were",
  "what", "would", "about", "there", "their", "which", "could", "other",
  "these", "first", "after", "where", "those", "being", "while", "should",
  "because", "before", "through", "between", "another", "around", "really",
  "going", "into", "then", "also", "back", "even", "must", "only", "most",
  "need", "next", "same", "still", "thing", "think", "today", "does", "done",
  "each", "else", "ever", "find", "give", "goes", "made", "more", "once",
  "said", "tell", "than", "upon", "used", "went", "yes", "yet", "his", "hers",
  "mine", "ours", "self", "some", "sure", "them", "they", "this", "thus",
  "unto", "very", "with", "your", "yours", "am", "is", "be", "do", "he", "if",
  "in", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we",
  "an", "as", "at", "by", "go", "hi", "ok", "call", "came", "come", "look",
  "over", "than", "that", "them", "then", "were", "will", "your", "work",
  "year", "your", "name", "meet", "meeting", "email", "please", "thanks",
  "thank", "hello", "okay", "sure", "great", "team", "week", "month", "date",
  "send", "sent", "read", "note", "notes", "text", "word", "words",
]);
