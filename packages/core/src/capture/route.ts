/**
 * Pure routing for a captured note about a person (BRD note-capture). No I/O,
 * no LLM — the caller supplies the classifier signal and the result of matching
 * the note's subject against existing contacts; this decides what happens next.
 * Kept pure so the decision is exhaustively unit-testable (see route.test.ts).
 */

/**
 * The four outcomes of a capture, once classified and matched:
 * - `not_note`        — not a note about a person; fall through to contact-add.
 * - `attach`          — one confident match; attach the note silently.
 * - `confirm_ambiguous` — several plausible people (or one only fuzzily matched);
 *                         ask which one before attaching.
 * - `confirm_create`  — nobody matches; offer to create a new contact + attach.
 */
export type CaptureRoute =
  | "not_note"
  | "attach"
  | "confirm_ambiguous"
  | "confirm_create";

export interface CaptureRoutingInput {
  /** Did the classifier read the capture as a note about a person? */
  isNoteAboutPerson: boolean;
  /** How many existing contacts plausibly match the note's subject name. */
  candidateCount: number;
  /**
   * True ONLY when there is exactly one candidate AND it is an unambiguous
   * (exact-name) match — the sole case we attach without asking. A lone
   * fuzzy/first-name match is deliberately NOT confident: attaching a note to
   * the wrong person is worse than a one-tap confirmation.
   */
  confidentSingleMatch: boolean;
}

/**
 * Decide how to route a capture. Order matters:
 * 1. Not a note ⇒ `not_note` (the contact-add path owns it).
 * 2. A confident single match ⇒ `attach` silently (Decision 1: only confident).
 * 3. No candidates ⇒ `confirm_create` (Decision 2: offer to create + attach).
 * 4. Anything else (many candidates, or one fuzzy match) ⇒ `confirm_ambiguous`
 *    (Decision 1: ANY ambiguity asks first — never guess the subject).
 */
export function routeNoteCapture(input: CaptureRoutingInput): CaptureRoute {
  if (!input.isNoteAboutPerson) return "not_note";
  if (input.confidentSingleMatch) return "attach";
  if (input.candidateCount === 0) return "confirm_create";
  return "confirm_ambiguous";
}
