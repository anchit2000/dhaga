/**
 * Search-answer prompt (M6 stage 3): given candidates retrieved from the
 * user's graph, compose an answer with receipts. Pure function, stable
 * system prompt first.
 */

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
  return `Candidate records from the user's graph:\n\n${candidateBlocks}\n\nQuestion: ${query}`;
}
