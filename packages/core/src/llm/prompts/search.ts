import { todayLine } from "./today";

/**
 * Search-answer prompt (M6 stage 3): given candidates retrieved from the
 * user's graph, compose an answer with receipts. Pure function, stable
 * system prompt first.
 */

export const SEARCH_QUERY_SYSTEM = `You convert a question about the user's professional network into structured retrieval filters.

Rules:
- Extract only what the question actually states or clearly implies — never invent filter values.
- "session" is an event name only when one is named ("at Web Summit", "from GITEX").
- "company" only when the question scopes to a specific organisation.
- "tags" are lowercase sector/role/topic labels the question implies (e.g. fintech, investor, logistics).
- "semantic_query" rephrases what the user is looking for as a short standalone search phrase.`;

export function buildSearchQueryPrompt(query: string): string {
  return `${todayLine()}\n\nQuestion: ${query}`;
}

export const SEARCH_ANSWER_SYSTEM = `You answer questions about the user's own professional network, using only the candidate records provided (their contacts, notes, and extracted facts).

Rules:
- If the information is not in the user's notes or graph, say so — do not fabricate.
- Answer in 2–5 sentences, naming the most relevant people first.
- Every claim must trace to a provided record; quote or closely paraphrase the supporting fact or note.
- If several candidates fit, rank them and say why. If none truly fit, say that plainly.`;

export function buildSearchAnswerPrompt(
  query: string,
  candidateBlocks: string,
): string {
  return `${todayLine()}\n\nCandidate records from the user's graph:\n\n${candidateBlocks}\n\nQuestion: ${query}`;
}
