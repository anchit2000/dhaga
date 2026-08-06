import { routeNoteCapture, type CaptureClassification, type ConfirmationOption } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { createNoteSubjectConfirmation } from "@/lib/repo/confirmations";
import { findRelationshipCandidates } from "@/lib/repo/edge-suggestions";
import type { NoteKind } from "@/lib/repo/notes";
import { chooseContactQuestion } from "@/utils/constants/messaging";
import { saveNoteWithFacts } from "../note-write";
import { focusContact, recordAttribution, type WalkState } from "../walk-state";

/**
 * Does `subjectName` refer to `contactName`? Exact, or the subject is that
 * person's full first name — never a mid-word prefix ("Sam" → "Samuel"). Shared
 * by the candidate filter below and by the "is this note about the person the
 * cursor is already on?" check in ./index, so both answer it the same way.
 */
export function namesSamePerson(subjectName: string, contactName: string): boolean {
  const subject = subjectName.trim().toLocaleLowerCase();
  const name = contactName.trim().toLocaleLowerCase();
  if (!subject || !name) return false;
  return name === subject || name.startsWith(`${subject} `);
}

/** True when the note was fully handled (attached, asked about, or salvaged). */
export async function routeNote(
  state: WalkState,
  text: string,
  classification: CaptureClassification,
  attachKind: NoteKind,
): Promise<boolean> {
  const { userId } = state;
  const subjectName = classification.subjectName?.trim() ?? "";
  const noteBody = classification.noteBody?.trim() || text;
  const candidates = subjectName
    ? await withUserDb(userId, () => findRelationshipCandidates(subjectName))
    : [];
  const strong = candidates.filter((candidate) => namesSamePerson(subjectName, candidate.name));
  const route = routeNoteCapture({
    isNoteAboutPerson: true,
    candidateCount: candidates.length,
    confidentSingleMatch: candidates.length === 1 && strong.length === 1,
  });

  if (route === "attach") {
    const target = candidates[0];
    focusContact(state, target.id, target.name);
    state.noteCount += 1;
    recordAttribution(state, target.name, "named");
    state.factCount += await saveNoteWithFacts({
      userId,
      contactId: target.id,
      contactName: target.name,
      kind: attachKind,
      body: noteBody,
    });
    return true;
  }
  if (route !== "confirm_ambiguous") return false; // confirm_create → normal establish

  // AMBIGUOUS → the confirmation inbox, never a guess and never a chat
  // interrogation. The note body rides in the confirmation payload, so NOTHING
  // is attached to anybody until the user picks; and because each ambiguity is
  // its own row there is no cap — a batch spanning a day can raise ten of them
  // and every one gets answered, instead of the first being asked in chat and
  // the rest silently becoming duplicate people.
  const options: ConfirmationOption[] = candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.name,
    sublabel: candidate.title,
  }));
  await withUserDb(userId, () =>
    createNoteSubjectConfirmation({
      noteBody,
      subjectName: subjectName || null,
      question: chooseContactQuestion(subjectName || null),
      options,
    }),
  );
  state.pendingConfirmations += 1;
  return true;
}
