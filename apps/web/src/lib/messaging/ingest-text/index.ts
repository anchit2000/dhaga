import type { ExtractedContact } from "@dhaga/core";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import type { NoteKind } from "@/lib/repo/notes";
import { UNNAMED_CONTACT_NAME } from "@/utils/constants/messaging";
import { createContactWithNote, extractNoteFacts } from "../note-write";
import { recordAttribution, setCurrentContact, type WalkState } from "../walk-state";
import { attachNote, isSenderAuthored, type IngestedNote } from "./attach";
import { namesSamePerson, routeNote } from "./route-note";

export type { IngestedNote } from "./attach";

/**
 * Establish-or-attach for a piece of free text (a forwarded note, a signature
 * block, a transcribed voice note, the text read off a photo), using exactly
 * the router the web quick-add uses (routeNoteCapture) so both surfaces behave
 * the same:
 *
 * - one confident match  → attach silently to that person (no duplicate contact)
 * - several plausible people → the confirmation inbox (./route-note)
 * - nobody matches / not a note → create the contact, text as its receipt
 *
 * EVERY note is classified, including one arriving mid-batch with a cursor
 * already set. The cursor is a FALLBACK — for a note that names nobody ("wants
 * intros to fintech founders") — never an override. That distinction is the
 * whole point at a 24h capture window: a batch can easily span a dozen people,
 * and silently filing a note about Bob onto Alice, whose card merely happened to
 * come first, is the one failure this walk must not have.
 *
 * Returns where the text landed, so a caller holding the artifact it was read
 * off (../process-item/media: the photo) can hang that onto the same note.
 */
export async function ingestText(
  state: WalkState,
  text: string,
  establishKind: NoteKind,
  attachKind: NoteKind,
): Promise<IngestedNote | null> {
  if (text.trim().length === 0) return null;
  const { userId } = state;

  // The parse runs with no DB connection held; it also classifies whether this
  // is a note ABOUT someone, who, and whether it is aimed at US rather than the
  // graph.
  const extracted = await extractContactFromText(userId, text);
  const { classification } = extracted;
  const subject = classification.subjectName?.trim() ?? "";
  const establishing = state.currentContactId == null;

  // An instruction says what to DO with the capture; it is not content. Stored
  // as a note it lands in someone's timeline as noise AND hands fact extraction
  // an imperative, which duly reads it back as a follow-up the sender never
  // asked for. With a contact already on the cursor the details it refers to
  // are saved, so the instruction can simply be dropped.
  //
  // With NOTHING on the cursor it is all we have, so it falls through to
  // ESTABLISH and creates the contact it names — nothing may be dropped
  // silently. It is kept off ./route-note for the same reason: an imperative
  // must never raise a "who is this about?" confirmation.
  const instructing = isSenderAuthored(attachKind) && classification.isInstruction;
  if (instructing && !establishing) return null;

  if (!instructing && classification.isNoteAboutPerson && !aboutCurrentContact(state, subject)) {
    // Names somebody other than whoever the cursor is on: let the router decide.
    // An unhandled result means "names a person we don't know yet" — fall
    // through and establish THEM, rather than filing their note onto the cursor.
    const routed = await routeNote(state, text, classification, attachKind);
    if (routed.handled) return routed.note;
  } else if (state.currentContactId != null) {
    // The weakest attribution in the flow: this note named nobody, so it lands
    // on whoever the batch was already on. Recorded as `assumed` so the summary
    // says so out loud instead of passing a guess off as a fact.
    const contactName = state.currentContactName ?? "";
    recordAttribution(state, contactName, "assumed");
    return attachNote(state, state.currentContactId, contactName, text, attachKind);
  }

  // ESTABLISH.
  const contact = namedContact(extracted.contact, subject);
  const { contactId, noteId } = await createContactWithNote(userId, contact, establishKind, text);
  setCurrentContact(state, contactId, contact.name);
  recordAttribution(state, contact.name, "new");
  // An instruction has no facts in it — only a verb aimed at us — so it is kept
  // as the receipt of what arrived but never mined.
  if (noteId && !instructing) {
    state.factCount += await extractNoteFacts({
      userId,
      contactId,
      noteId,
      contactName: contact.name,
      body: text,
    });
  }
  return { contactId, noteId };
}

/**
 * Give the capture a name it can be found by. Extraction returns an empty name
 * for anything that isn't a person — an office directory, a society
 * noticeboard, a badge printed with only a company — and a contact saved with
 * an empty name renders as a blank row that no search will ever surface again.
 *
 * The classifier's subject is the best fallback, then the organisation itself,
 * then a visible placeholder the user can rename. Promoting the organisation
 * CLEARS `company`, or the profile would show it employing itself.
 */
function namedContact(parsed: ExtractedContact, subject: string): ExtractedContact {
  if (parsed.name.trim()) return parsed;
  if (subject) return { ...parsed, name: subject };
  const org = parsed.company?.trim();
  if (org) return { ...parsed, name: org, company: null };
  return { ...parsed, name: UNNAMED_CONTACT_NAME };
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
