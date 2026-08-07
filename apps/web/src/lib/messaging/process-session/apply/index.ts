import type { BatchPlan, UnclearNote } from "@dhaga/core";
import { plannedItemSeqs } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { createNoteSubjectConfirmation } from "@/lib/repo/confirmations";
import { chooseContactQuestion } from "@/utils/constants/messaging";
import { markSeqs, type ApplyContext } from "./context";
import { applyPerson, type AppliedPerson } from "./person";

export { buildApplyContext, type ApplyContext } from "./context";
export type { AppliedPerson } from "./person";

export interface ApplyResult {
  people: AppliedPerson[];
  unclearCount: number;
  factCount: number;
  /** Messages the plan never mentioned. A planner bug — surfaced, not swallowed. */
  unaccountedSeqs: number[];
}

/**
 * Turn a plan into writes. The model planned; this does the work — deterministic
 * code with no judgement of its own, the same split confirmations/apply.ts uses
 * for the knowledge graph (CLAUDE.md Rule 5).
 *
 * Every person is applied in isolation: one failure costs that ONE person and is
 * recorded against their messages, rather than aborting the batch and stranding
 * everybody who came after them.
 */
export async function applyPlan(context: ApplyContext, plan: BatchPlan): Promise<ApplyResult> {
  const people: AppliedPerson[] = [];
  let factCount = 0;
  for (const planned of plan.people) {
    try {
      const applied = await applyPerson(context, planned);
      people.push(applied.person);
      factCount += applied.factCount;
    } catch (error) {
      logActionError("messaging_apply_person", error);
      const seqs = [
        ...planned.sourceItemSeqs,
        ...planned.notes.flatMap((note) => note.sourceItemSeqs),
      ];
      await markSeqs(context, seqs, "unreadable", { reason: "save_failed" });
    }
  }

  let unclearCount = 0;
  for (const note of plan.unclear) {
    try {
      await applyUnclear(context, note);
      unclearCount += 1;
    } catch (error) {
      logActionError("messaging_apply_unclear", error);
      await markSeqs(context, note.sourceItemSeqs, "unreadable", { reason: "save_failed" });
    }
  }

  // ACCOUNTING. Every message must end up with a verdict; a plan that forgot one
  // would otherwise leave it silently unsaved and unexplained. Stamping it here
  // is what turns a planner bug into something the sender is told about and the
  // capture log can show (CLAUDE.md Rule 12).
  const planned = plannedItemSeqs(plan);
  const unaccountedSeqs = [...context.bySeq.keys()].filter((seq) => !planned.has(seq)).sort((a, b) => a - b);
  await markSeqs(context, unaccountedSeqs, "unaccounted", { reason: "not_in_plan" });

  return { people, unclearCount, factCount, unaccountedSeqs };
}

/**
 * An ambiguity: parked in the confirmation inbox, stored on NOBODY until the
 * user picks. Raised in the app rather than asked in chat, because chat holds
 * one open question per sender — a batch with three ambiguities could only ever
 * resolve the first and silently duplicated the rest.
 *
 * `origin: "messaging"` is what makes it VISIBLE: an inline quick-add
 * note_subject is answered on the spot and stays out of the inbox, but one
 * raised by a background batch has no other surface, and hiding it strands the
 * user's note where nothing can reach it.
 */
async function applyUnclear(context: ApplyContext, note: UnclearNote): Promise<void> {
  const options = note.candidateContactIds
    .map((id) => context.candidatesById.get(id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .map((candidate) => ({ id: candidate.id, label: candidate.name, sublabel: candidate.title }));
  const confirmation = await withUserDb(context.userId, () =>
    createNoteSubjectConfirmation({
      noteBody: note.noteBody,
      subjectName: note.subjectName,
      question: chooseContactQuestion(note.subjectName),
      options,
      origin: "messaging",
    }),
  );
  await markSeqs(context, note.sourceItemSeqs, "unclear", { confirmationId: confirmation.id });
}
