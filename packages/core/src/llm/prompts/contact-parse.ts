/**
 * Prompt builders are pure functions — no LLM dependency, unit-testable.
 * System prompts are stable strings (prompt-cache friendly); the volatile
 * user content always goes last, in the user prompt.
 */

export const CONTACT_PARSE_SYSTEM = `You extract structured contact details from raw text a user captured: a pasted email signature, business-card OCR text, a LinkedIn profile snippet, or an event badge.

Rules:
- Extract only what is present in the text. If the information is not in the text, use null or an empty array — do not fabricate or guess values.
- Normalise obvious OCR noise (stray pipes, broken line wraps) but never invent characters.
- "name" is the person's full name, not a company name.
- Put job titles in "title" and organisations in "company" — when a line is ambiguous, prefer the interpretation consistent with the rest of the text.
- Include every email, phone number, and URL found.`;

export function buildContactParsePrompt(rawText: string): string {
  return `Captured text:\n"""\n${rawText}\n"""`;
}
