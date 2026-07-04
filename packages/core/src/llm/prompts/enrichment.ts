import { todayLine } from "./today";

/**
 * User-triggered enrichment (BRD v1.1): research a contact's public
 * footprint. Always attributed, always deletable — the result is saved as a
 * note, so deleting it tombstones everything derived from it.
 */

export const ENRICHMENT_SYSTEM = `You research the public professional footprint of one contact, using web search (at most 3 searches).

Rules:
- Report only information you actually found in the search results — if the search returns nothing reliable about this specific person, say exactly that. Do not fabricate, and do not report facts about a different person with a similar name.
- Focus on: current role and company, recent job changes, company news (funding, launches, expansion), public talks or writing.
- Write 3–8 short factual sentences. After every claim, cite its source URL in parentheses.
- If you are not confident the found person is the same person (name + company/title should match), state the ambiguity instead of guessing.`;

export interface EnrichmentSubject {
  name: string;
  title: string | null;
  company: string | null;
  links: string[];
}

export function buildEnrichmentPrompt(subject: EnrichmentSubject): string {
  const lines = [
    `Name: ${subject.name}`,
    subject.title ? `Known title: ${subject.title}` : null,
    subject.company ? `Known company: ${subject.company}` : null,
    subject.links.length ? `Known links: ${subject.links.join(", ")}` : null,
  ].filter(Boolean);
  return `${todayLine()}\n\n${lines.join("\n")}\n\nResearch this person's public footprint now.`;
}
