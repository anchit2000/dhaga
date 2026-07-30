import { withUserDb } from "@/lib/db/request-scope";
import { createContactProfile } from "@/lib/repo/contacts";
import { vcardToCandidates } from "@/lib/import";
import { cardUnreadableNotice, locationNoteBody, orphanItemNotice } from "@/utils/constants/messaging";
import { saveNote } from "../note-write";
import { addNotice, setCurrentContact, type WalkState } from "../walk-state";

/**
 * A forwarded contact card is STRUCTURED data, so it goes straight through the
 * vCard importer to createContactProfile — never through text extraction. That
 * keeps every labelled field (work vs. mobile number, org, title) and costs no
 * AI call. createContactProfile also promotes a matching "mentioned" stub in
 * place, so a card for someone a note already referenced fills that person in
 * rather than duplicating them.
 */
export async function handleContactCard(state: WalkState, vcard: string): Promise<void> {
  const first = vcardToCandidates(vcard)[0];
  if (!first) {
    addNotice(state, cardUnreadableNotice());
    return;
  }
  const contactId = await withUserDb(state.userId, () =>
    createContactProfile(first.contact, "messaging"),
  );
  // No fact extraction here (nor on a scanned card): the receipt is the card's
  // own fields, which are already stored structurally — same as web import.
  await saveNote(state.userId, contactId, "capture_source", first.receipt);
  setCurrentContact(state, contactId, first.contact.name);
}

/** Location pin → a note on the current contact; reported when there is none. */
export async function handleLocation(
  state: WalkState,
  location: { latitude: number; longitude: number; name: string | null },
): Promise<void> {
  if (state.currentContactId == null) {
    addNotice(state, orphanItemNotice());
    return;
  }
  const label = location.name ?? `${location.latitude}, ${location.longitude}`;
  await saveNote(state.userId, state.currentContactId, "text", locationNoteBody(label));
  state.noteCount += 1;
}
