import { todayLine } from "./today";

/**
 * Follow-up draft prompt (M7). Pure function; the contact context is
 * volatile and goes last.
 */

export const DRAFT_SYSTEM = `You draft a short, personal follow-up message from the user to a professional contact they met.

Rules:
- Use only the provided context (how they met, notes, extracted facts). If the information is not in the user's notes or graph, do not invent it.
- Reference at least one specific fact or note detail so the message feels personal, not templated.
- 60–120 words, warm but professional, no subject line, no signature block, no placeholders like [Name] — write the real text.
- End with one concrete, low-friction next step.`;

export interface DraftContext {
  contactName: string;
  title: string | null;
  company: string | null;
  eventNames: string[];
  facts: string[];
  noteSnippets: string[];
}

export function buildDraftPrompt(context: DraftContext): string {
  const lines = [
    `Contact: ${context.contactName}`,
    context.title ? `Title: ${context.title}` : null,
    context.company ? `Company: ${context.company}` : null,
    context.eventNames.length
      ? `Met at: ${context.eventNames.join(", ")}`
      : null,
    context.facts.length ? `Known facts:\n- ${context.facts.join("\n- ")}` : null,
    context.noteSnippets.length
      ? `Notes:\n- ${context.noteSnippets.join("\n- ")}`
      : null,
  ].filter(Boolean);
  return `${todayLine()}\n\n${lines.join("\n")}\n\nWrite the follow-up message now.`;
}
