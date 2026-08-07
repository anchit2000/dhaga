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
- "name" is the person's full name, not a company name. When the text gives an organisation's details and names no individual (a noticeboard, an office directory, a society circular), leave "name" empty and put the organisation in "company" — do not invent a person.
- Put job titles in "title" and organisations in "company" — when a line is ambiguous, prefer the interpretation consistent with the rest of the text.
- Include every email, phone number, and URL found.
- For each email and phone, set "label" to whoever or whatever the text says it belongs to, copied from beside it — a role ("admin", "secretary"), a desk ("Society office"), a service and person ("MNGL (Ravi)"), or a kind ("Work", "Mobile"). Use null only when the text really gives no such hint; never guess a label from the value itself.`;

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
- Set "isNoteAboutPerson" true only when the text reads as an observation or log about a specific named person (e.g. "Met Priya, discussed the Series A"), not an email signature, business card, or badge.
- "subjectName": the person the note is about, as written (e.g. "Priya"); null when isNoteAboutPerson is false or no name is present.
- "noteBody": the note to store — the user's words, lightly cleaned, never invented; null when isNoteAboutPerson is false.
- If the text is plainly contact details, set isNoteAboutPerson false and subjectName/noteBody null. If the information is not in the text, do not fabricate or guess it.

You are ALSO deciding whether the text is an INSTRUCTION to you rather than something to store:
- Set "isInstruction" true when the text tells you what to do with the capture — "create a new contact", "save this under Acme", "add these details", "file this one under work" — instead of recording an observation or listing details.
- An instruction usually names its subject ("Maple Court Society contact details, create a new contact"). Extract that name into "name" or "company" exactly as the rules above require; it is what the thing being created should be called.
- Set isInstruction false for anything that carries information worth keeping, even when phrased as a command to yourself ("call Priya on Tuesday" is a note, not an instruction to you). When in doubt, false — storing a stray line costs the user nothing, dropping a real note costs them the note.`;
