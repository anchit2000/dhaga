import { todayLine } from "./today";
import type { CalendarDay } from "../../dates/calendar-day";

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

export function buildContactParsePrompt(rawText: string, today?: CalendarDay): string {
  return `${todayLine(today)}\n\nCaptured text:\n"""\n${rawText}\n"""`;
}

/**
 * The quick-add capture system prompt: the contact-parse rules above PLUS a
 * classification of whether the text is a note about a person. Folding the
 * classification into this one call keeps note-detection free of a second AI
 * round-trip and a second metered action. Composed from CONTACT_PARSE_SYSTEM
 * (not a fork) so the contact rules stay single-sourced; still a stable string,
 * so it is prompt-cache friendly. Reuse buildContactParsePrompt for the volatile
 * user content (it already carries todayLine last).
 */
export const CAPTURE_EXTRACTION_SYSTEM = `${CONTACT_PARSE_SYSTEM}

You are ALSO deciding whether this capture is a NOTE ABOUT A PERSON rather than that person's raw contact details:
- Set "isNoteAboutPerson" true only when the text reads as an observation or log about a specific named person (e.g. "Met Anchit, discussed the Series A"), not an email signature, business card, or badge.
- "subjectName": the person the note is about, as written (e.g. "Anchit"); null when isNoteAboutPerson is false or no name is present.
- "noteBody": the note to store — the user's words, lightly cleaned, never invented; null when isNoteAboutPerson is false.
- If the text is plainly contact details, set isNoteAboutPerson false and subjectName/noteBody null. If the information is not in the text, do not fabricate or guess it.`;
