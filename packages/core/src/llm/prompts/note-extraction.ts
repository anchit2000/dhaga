import { todayLine } from "./today";

/**
 * Note → graph extraction prompt (BRD §6.3). Pure function, no LLM dependency.
 * Stable system prompt first (cacheable); the note text goes last.
 */

export const NOTE_EXTRACTION_SYSTEM = `You turn a user's note about a professional contact into structured knowledge-graph entries.

Rules:
- Extract only what the note states or directly implies. If the information is not in the note, return empty arrays — do not fabricate.
- "facts" are short standalone sentences about the contact (their role, what they want, personal details, preferences). Set confidence lower for hedged or implied statements.
- "relationships" connect the contact (subject "contact") or named third parties to companies/people. Use a concise, reusable snake_case predicate such as parent_of, interviewed_with, worked_with, advised, or attended_with. Preserve unusual but meaningful context instead of forcing it into a generic "knows" edge.
- "follow_ups" are concrete actions the note implies the user should take; copy timing hints verbatim into due_hint.
- "tags" are 1–4 lowercase topical labels useful for later filtering (sector, seniority, intent).`;

export function buildNoteExtractionPrompt(
  contactName: string,
  noteText: string,
): string {
  return `${todayLine()}\n\nThe note is about: ${contactName}\n\nNote:\n"""\n${noteText}\n"""`;
}
