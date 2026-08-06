import { extractContactFromText } from "@/lib/ai/contact-extraction";
import type { NoteKind } from "@/lib/repo/notes";
import { createContactWithNote, extractNoteFacts, saveNoteWithFacts } from "../note-write";
import { recordAttribution, setCurrentContact, type WalkState } from "../walk-state";
import { namesSamePerson, routeNote } from "./route-note";

/**
 * Establish-or-attach for a piece of free text (a forwarded note, a signature
 * block, a transcribed voice note), using exactly the router the web quick-add
 * uses (routeNoteCapture) so both surfaces behave the same:
 *
 * - one confident match  → attach silently to that person (no duplicate contact)
 * - several plausible people → ASK IN THE CHAT (a pending question, ../answer)
 * - nobody matches / not a note → create the contact, text as its receipt
 *
 * EVERY note is classified, including one arriving mid-batch with a cursor
 * already set. The cursor is a FALLBACK — for a note that names nobody ("wants
 * intros to fintech founders") — never an override. That distinction is the
 * whole point at a 24h capture window: a batch can easily span a dozen people,
 * and silently filing a note about Bob onto Alice, whose card merely happened to
 * come first, is the one failure this walk must not have.
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

  // The parse runs with no DB connection held; it also classifies whether this
  // is a note ABOUT someone, and who.
  const extracted = await extractContactFromText(userId, text);
  const { classification } = extracted;
  const subject = classification.subjectName?.trim() ?? "";

  if (classification.isNoteAboutPerson && !aboutCurrentContact(state, subject)) {
    // Names somebody other than whoever the cursor is on: let the router decide.
    // A `false` here means "names a person we don't know yet" — fall through and
    // establish THEM, rather than filing their note onto the cursor.
    const handled = await routeNote(state, text, classification, attachKind);
    if (handled) return;
  } else if (state.currentContactId != null) {
    // The weakest attribution in the flow: this note named nobody, so it lands
    // on whoever the batch was already on. Recorded as `assumed` so the summary
    // says so out loud instead of passing a guess off as a fact.
    state.noteCount += 1;
    recordAttribution(state, state.currentContactName ?? "", "assumed");
    state.factCount += await saveNoteWithFacts({
      userId,
      contactId: state.currentContactId,
      contactName: state.currentContactName ?? "",
      kind: attachKind,
      body: text,
    });
    return;
  }

  // ESTABLISH. A note-shaped capture can parse to a nameless contact; the
  // classifier's subject is the better name then, and an unnamed contact helps
  // nobody.
  const parsed = extracted.contact;
  const contact = parsed.name.trim() ? parsed : { ...parsed, name: subject };
  const { contactId, noteId } = await createContactWithNote(userId, contact, establishKind, text);
  setCurrentContact(state, contactId, contact.name);
  recordAttribution(state, contact.name, "new");
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

/**
 * Is this note about the person the cursor is already on? Only then may the
 * cursor claim a note that names somebody — otherwise the note is routed on its
 * own merits. With no cursor there is nobody for it to be about.
 */
function aboutCurrentContact(state: WalkState, subjectName: string): boolean {
  if (state.currentContactId == null || !state.currentContactName) return false;
  if (!subjectName) return true; // named nobody in particular → the cursor stands
  return namesSamePerson(subjectName, state.currentContactName);
}
