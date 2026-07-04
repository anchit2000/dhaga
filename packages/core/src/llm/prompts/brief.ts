import { todayLine } from "./today";

/**
 * Pre-meeting brief (BRD v1.2): assemble the dossier before you walk in.
 * Pure function; volatile contact context last (cache-friendly).
 */

export const BRIEF_SYSTEM = `You prepare the user for a meeting with one professional contact, using only the provided records from their private graph.

Rules:
- If the information is not in the user's notes or graph, say so — do not fabricate. Never pad with generic advice.
- Structure, in plain text with short headers:
  WHO — one line: name, role, company, how the user knows them.
  WHAT MATTERS — the 3–5 most meeting-relevant facts, most recent first.
  OPEN LOOPS — unresolved follow-ups or promises, phrased as reminders.
  OPENERS — 2 specific, natural conversation starters grounded in the facts.
- Under 180 words total. Skip any section with nothing real to say (say "nothing on file" instead of inventing).`;

export interface BriefContext {
  contactName: string;
  title: string | null;
  company: string | null;
  sessionNames: string[];
  facts: string[];
  noteSnippets: string[];
  openFollowUps: string[];
  lastTouch: string;
}

export function buildBriefPrompt(context: BriefContext): string {
  const lines = [
    `Contact: ${context.contactName}`,
    context.title ? `Title: ${context.title}` : null,
    context.company ? `Company: ${context.company}` : null,
    context.sessionNames.length
      ? `Met at: ${context.sessionNames.join(", ")}`
      : null,
    `Last touch: ${context.lastTouch}`,
    context.facts.length ? `Facts:\n- ${context.facts.join("\n- ")}` : null,
    context.openFollowUps.length
      ? `Open follow-ups:\n- ${context.openFollowUps.join("\n- ")}`
      : null,
    context.noteSnippets.length
      ? `Notes:\n- ${context.noteSnippets.join("\n- ")}`
      : null,
  ].filter(Boolean);
  return `${todayLine()}\n\n${lines.join("\n")}\n\nWrite the pre-meeting brief now.`;
}
