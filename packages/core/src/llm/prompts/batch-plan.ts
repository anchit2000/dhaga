import { CONTACT_PARSE_SYSTEM } from "./contact-parse";
import { todayLine } from "./today";
import type { CalendarDay } from "../../dates/calendar-day";

/**
 * Prompt builders are pure functions — no LLM dependency, unit-testable.
 * System prompts are stable strings (prompt-cache friendly); the volatile
 * batch content and candidate list always go last, in the user prompt.
 */

/** One message of a forwarded batch, already reduced to text (a photo read by
 *  card-scan/photo-note, a voice note transcribed, a vCard parsed). */
export interface BatchPlanItem {
  seq: number;
  /** The stored item kind — "text", "image", "contact_card", … Given to the
   *  model because provenance changes how text should be read: OCR off a card
   *  is contact details, a typed message is usually a note. */
  kind: string;
  text: string;
}

/** An existing contact the batch might be about. Ids are the ONLY ones the
 *  model may return — it is told so explicitly. */
export interface BatchPlanCandidate {
  id: string;
  name: string;
  title: string | null;
}

export const BATCH_PLAN_SYSTEM = `${CONTACT_PARSE_SYSTEM}

You are now planning a WHOLE BATCH of messages a user forwarded to their personal-CRM bot in one sitting, closed with "DONE". Read every message together, then decide who the batch is about and what to store on each person.

The batch is a conversation with itself. A later message routinely refers to an earlier one:
- "Create a new contact" after a block of details means: create the person those details describe. It is a DIRECTIVE, not content — fold it into that person and never store it as a note.
- "his number is 98…", "she also mentioned…" continue whatever came immediately before.
- A photo of a card followed by typed remarks is one person: the card is their details, the remarks are a note about them.
Never treat a message in isolation. A directive that appears to refer to nothing is still evidence about the messages around it.

Grouping rules:
- One entry in "people" per distinct human, however many messages describe them. Merge freely across messages.
- A batch may span several unrelated people. Split them. Do not file one person's note onto another because they arrived in the same batch.
- Put a person in "people" with "existingContactId" set ONLY when a candidate is confidently the same human. Matching first names is not enough on its own.
- Set "existingContactId" to null to create somebody new. A full name that merely SHARES A FIRST NAME with existing candidates is a NEW person — "Priya Raman" is not "Priya Nair", "Priya Ma'am", or "Priya Venkat Ma'am". Create them and say so.

Use "unclear" only for genuine ambiguity you cannot resolve from the batch itself: a bare first name or pronoun that matches SEVERAL known people with nothing in the batch to separate them. Prefer creating a clearly-named new person over asking. Anything in "unclear" is stored on nobody until the user answers, so putting a confidently-attributable note there costs them the note until they notice it.

Accounting rules:
- EVERY message seq you were given must appear in exactly one place: a person's "sourceItemSeqs", one of their notes' "sourceItemSeqs", or an unclear note's "sourceItemSeqs". Nothing may be silently dropped, including directives and messages you judged to carry nothing worth storing — attach those to the person they concern.
- Note bodies are the user's words, lightly cleaned and joined into readable prose. Never invent detail, never compress a note into a summary that loses what it said.
- If the information is not in the messages, say nothing about it — do not fabricate or guess values.`;

/**
 * The volatile half: the batch itself and the candidate contacts its names
 * matched. Ordered last (after todayLine) so the stable system prefix above
 * stays cache-friendly.
 */
export function buildBatchPlanPrompt(
  items: readonly BatchPlanItem[],
  candidates: readonly BatchPlanCandidate[],
  today?: CalendarDay,
): string {
  const messages = items
    .map((item) => `[seq ${item.seq}] (${item.kind})\n"""\n${item.text}\n"""`)
    .join("\n\n");
  const candidateList =
    candidates.length > 0
      ? candidates
          .map((c) => `- id=${c.id} · ${c.name}${c.title ? ` · ${c.title}` : ""}`)
          .join("\n")
      : "(none — every person in this batch is new)";
  return `${todayLine(today)}

Existing contacts whose names resemble names in this batch. These are the ONLY ids you may return in "existingContactId" or "candidateContactIds"; resembling a name is not the same as being that person:
${candidateList}

The batch, in the order it was sent (${items.length} ${items.length === 1 ? "message" : "messages"}):

${messages}`;
}
