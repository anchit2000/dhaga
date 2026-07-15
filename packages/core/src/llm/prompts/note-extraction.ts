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

/**
 * Extraction from a public-web enrichment note. Distinct from the note prompt
 * on purpose: web findings routinely surface more than one person by the same
 * name, and the plain note prompt — told "the note is about X" — responds by
 * returning empty arrays, so nothing gets extracted at all. Here we extract
 * everything and let the app badge it unverified for the user to confirm or
 * delete, rather than silently dropping a whole enrichment on ambiguity.
 */
export const ENRICHMENT_EXTRACTION_SYSTEM = `You turn public-web research findings about a professional contact into structured knowledge-graph entries. The findings were gathered by web search and may be imperfect.

Rules:
- Extract every concrete fact the findings state about the contact — role, company, job changes, notable work. Do not invent anything the findings don't say.
- The findings may describe more than one person who shares the contact's name. Do NOT return empty because of this. Extract the facts anyway; when a fact plainly belongs to one specific candidate, add a short distinguishing detail in the text (e.g. "(the ACME co-founder)") so the user can tell candidates apart and delete the wrong ones.
- "facts" are short standalone sentences. Set confidence to reflect how directly the findings support each one.
- "relationships" connect the contact (subject "contact") or named third parties to companies/people, using a concise snake_case predicate.
- "follow_ups" are concrete actions the findings imply; copy any timing hints verbatim into due_hint.
- "tags" are 1–4 lowercase topical labels (sector, seniority, intent).`;

export function buildEnrichmentExtractionPrompt(
  contactName: string,
  findingsText: string,
): string {
  return `${todayLine()}\n\nThe contact these findings are meant to be about: ${contactName}\n\nWeb findings:\n"""\n${findingsText}\n"""`;
}
