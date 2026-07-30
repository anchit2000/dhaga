import { emptyExtractedContact, routeNoteCapture, type CaptureClassification } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { findRelationshipCandidates } from "@/lib/repo/edge-suggestions";
import { createPendingQuestion, getPendingQuestion } from "@/lib/repo/messaging";
import type { NoteKind } from "@/lib/repo/notes";
import {
  chooseContactReply,
  extraAmbiguityNotice,
  type MessagingQuestionOption,
} from "@/utils/constants/messaging";
import { createContactWithNote, extractNoteFacts, saveNoteWithFacts } from "./note-write";
import { addNotice, focusContact, setCurrentContact, type WalkState } from "./walk-state";

/**
 * Establish-or-attach for a piece of free text (a forwarded note, a signature
 * block, a transcribed voice note). With a current contact the text is a note on
 * them; without one it has to decide WHO it is about, using exactly the router
 * the web quick-add uses (routeNoteCapture) so both surfaces behave the same:
 *
 * - one confident match  → attach silently to that person (no duplicate contact)
 * - several plausible people → ASK IN THE CHAT (a pending question, ./answer)
 * - nobody matches / not a note → create the contact, text as its receipt
 *
 * Only ONE question is asked per batch: a second ambiguous note is saved under a
 * new person and reported in the summary, which keeps this a single short-lived
 * record instead of a conversational state machine.
 */
export async function ingestText(
  state: WalkState,
  text: string,
  establishKind: NoteKind,
  attachKind: NoteKind,
): Promise<void> {
  if (text.trim().length === 0) return;
  const { userId } = state;

  if (state.currentContactId != null) {
    state.noteCount += 1;
    state.factCount += await saveNoteWithFacts({
      userId,
      contactId: state.currentContactId,
      contactName: state.currentContactName ?? "",
      kind: attachKind,
      body: text,
    });
    return;
  }

  // ESTABLISH. The LLM (or offline heuristic) parse runs with no connection
  // held; it also classifies whether this is a note ABOUT someone.
  const extracted = await extractContactFromText(userId, text);
  if (extracted.classification.isNoteAboutPerson) {
    const handled = await routeNote(state, text, extracted.classification, attachKind);
    if (handled) return;
  }

  const parsed = extracted.contact;
  const subject = extracted.classification.subjectName?.trim() ?? "";
  // A note-shaped capture can parse to a nameless contact; the classifier's
  // subject is the better name then, and an unnamed contact helps nobody.
  const contact = parsed.name.trim() ? parsed : { ...parsed, name: subject };
  const { contactId, noteId } = await createContactWithNote(userId, contact, establishKind, text);
  setCurrentContact(state, contactId, contact.name);
  if (noteId) {
    state.factCount += await extractNoteFacts({
      userId,
      contactId,
      noteId,
      contactName: contact.name,
      body: text,
    });
  }
}

/** True when the note was fully handled (attached, asked about, or salvaged). */
async function routeNote(
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
  const lower = subjectName.toLocaleLowerCase();
  // "Confident" = the lone candidate's name IS the subject (exact) or the
  // subject is its full first name — never a mid-word prefix ("Sam"→"Samuel").
  const strong = candidates.filter((candidate) => {
    const name = candidate.name.toLocaleLowerCase();
    return name === lower || name.startsWith(`${lower} `);
  });
  const route = routeNoteCapture({
    isNoteAboutPerson: true,
    candidateCount: candidates.length,
    confidentSingleMatch: candidates.length === 1 && strong.length === 1,
  });

  if (route === "attach") {
    const target = candidates[0];
    focusContact(state, target.id, target.name);
    state.noteCount += 1;
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

  const options: MessagingQuestionOption[] = candidates.map((candidate) => ({
    contactId: candidate.id,
    label: candidate.name,
    sublabel: candidate.title,
  }));
  const chat = { provider: state.provider, externalId: state.externalId };
  const open = state.askedQuestion || (await withUserDb(userId, () => getPendingQuestion(chat)));
  if (!open) {
    await withUserDb(userId, () =>
      createPendingQuestion({ ...chat, subjectName: subjectName || null, noteBody, options }),
    );
    state.askedQuestion = true;
    await state.client.sendText({
      externalUserId: state.externalId,
      text: chooseContactReply(subjectName || null, options),
    });
    return true;
  }

  // A question is already open for this chat. Rather than queue a second one,
  // save the note under a new person and say so — nothing is ever dropped.
  const name = subjectName || "Unnamed contact";
  const { contactId } = await createContactWithNote(
    userId,
    { ...emptyExtractedContact(), name },
    attachKind,
    noteBody,
  );
  setCurrentContact(state, contactId, name);
  addNotice(state, extraAmbiguityNotice(name));
  return true;
}
