import type { BatchPlan, ExtractedContact, PlannedPerson, UnclearNote } from "@dhaga/core";
import { contact } from "./harness";

/**
 * Builders for the one thing the model now produces: a BatchPlan over the WHOLE
 * batch (packages/core/src/schemas/batch-plan.ts).
 *
 * A case states the plan in the terms the model reasons in — "these seqs are one
 * person, this seq is a note about them" — and then asserts on what deterministic
 * code did with it. Everything the old fixture expressed as a per-message
 * extraction result (a cursor, an attribution basis) has no equivalent here, on
 * purpose: those were the mechanism of the bug this replaced.
 */

export function plan(input: { people?: PlannedPerson[]; unclear?: UnclearNote[] }): BatchPlan {
  return { people: input.people ?? [], unclear: input.unclear ?? [] };
}

/**
 * One planned person. `existingContactId` defaults to null — "create somebody
 * new" — because that is the plan a full name deserves even when existing
 * contacts share its first name.
 */
export function person(input: {
  name: string;
  existingContactId?: string;
  /** Every seq that fed this person, including directives that stored nothing. */
  seqs: number[];
  notes?: Array<{ body: string; seqs: number[] }>;
  contact?: ExtractedContact;
}): PlannedPerson {
  return {
    existingContactId: input.existingContactId ?? null,
    contact: input.contact ?? contact(input.name),
    sourceItemSeqs: input.seqs,
    notes: (input.notes ?? []).map((note) => ({ body: note.body, sourceItemSeqs: note.seqs })),
  };
}

/** A note the planner would not attribute — stored on NOBODY until answered. */
export function unclear(input: {
  subjectName: string | null;
  body: string;
  candidateIds: string[];
  seqs: number[];
}): UnclearNote {
  return {
    subjectName: input.subjectName,
    noteBody: input.body,
    candidateContactIds: input.candidateIds,
    sourceItemSeqs: input.seqs,
  };
}
