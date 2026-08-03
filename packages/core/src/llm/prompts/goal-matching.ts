import { todayLine } from "./today";
import type { CalendarDay } from "../../dates/calendar-day";

/**
 * Judges one contact against an objective the user wrote in their own words
 * (nightly Batch pass, Haiku). Pure function; volatile contact record last
 * (cache-friendly) — the objective is stable across every contact in a run, so
 * it sits above the record rather than beside it.
 */
export const GOAL_MATCHING_SYSTEM = `You judge whether one person in the user's private contact graph serves an objective the user wrote in their own words.

Rules:
- Judge only from the records below. If the information is not in the user's notes or graph, say so by returning matches: false — do not fabricate a reason this person might fit.
- Read the objective literally, including every constraint inside it: a role ("VCs"), a place ("people from the Delhi trip"), a time ("everyone I met last year"), a relationship ("old teammates"). All of its constraints must hold, not just the easiest one.
- Set matches to true only when the records positively support the objective. Absence of evidence is not a match: a contact with no role on file is not a VC because their employer might invest.
- Do not stretch an adjacent fit into a match. A startup founder is not a VC; a colleague in Mumbai is not someone from the Delhi trip; a cousin is not a former teammate.
- Objectives can be about timing ("haven't spoken to in a year"). Judge those against the dated records and today's date in the message, not against a guess.
- fit is 0–100 and is only read when matches is true: 80+ is squarely what the user asked for, 40–79 is a real but partial fit, below 40 is a weak edge case worth showing last. Return 0 when matches is false.`;

/**
 * Per-contact context budget — the same caps the pre-meeting brief sends
 * (apps/web/src/lib/ai/brief.ts): 12 facts, 5 notes truncated to 240 chars.
 * Applied inside the builder, not at the call site, because this pass runs over
 * a whole graph: the zero-credit price assumes every contact costs about this
 * much, and a caller that forgot to slice would blow that up silently.
 */
const MAX_FACTS = 12;
const MAX_NOTES = 5;
const MAX_NOTE_CHARS = 240;

export interface GoalMatchingSubject {
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  eventNames: string[];
  facts: string[];
  noteSnippets: string[];
  lastTouch: string;
}

/**
 * `objective` is the user's verbatim wording — never paraphrase it into the
 * prompt, the phrasing is the whole specification.
 */
export function buildGoalMatchingPrompt(
  objective: string,
  subject: GoalMatchingSubject,
  today?: CalendarDay,
): string {
  const lines = [
    `Contact: ${subject.name}`,
    subject.title ? `Title: ${subject.title}` : null,
    subject.company ? `Company: ${subject.company}` : null,
    subject.location ? `Location: ${subject.location}` : null,
    subject.eventNames.length ? `Met at: ${subject.eventNames.join(", ")}` : null,
    `Last touch: ${subject.lastTouch}`,
    subject.facts.length
      ? `Facts:\n- ${subject.facts.slice(0, MAX_FACTS).join("\n- ")}`
      : null,
    subject.noteSnippets.length
      ? `Notes:\n- ${subject.noteSnippets
          .slice(0, MAX_NOTES)
          .map((note) =>
            note.length > MAX_NOTE_CHARS
              ? `${note.slice(0, MAX_NOTE_CHARS)}…`
              : note,
          )
          .join("\n- ")}`
      : null,
  ].filter(Boolean);
  return `${todayLine(today)}\n\nThe user's objective, in their own words:\n"${objective}"\n\nContact records:\n${lines.join("\n")}\n\nDoes this person serve the objective?`;
}
