import type { MessagingClient } from "@dhaga/core/src/messaging";
import { UNNAMED_CONTACT_NAME, type NoteAttributionBasis } from "@/utils/constants/messaging";

/**
 * Mutable state threaded through the positional walk of a session's items.
 * `currentContactId` is the "cursor": a contact-establishing item (contact
 * card, card-scan image, or the first free-text with no contact yet) sets it,
 * and every following note/location attaches to it until the next one resets
 * it. Counters feed the closing summary. No PII is ever logged from here.
 *
 * `notices` is the honesty channel: anything the walk could NOT do (an
 * unreadable photo, an attachment that wouldn't download, a pin that arrived
 * before any contact) is appended here and reported in the summary, so no item
 * is ever dropped without the sender being told.
 */
export interface WalkState {
  readonly userId: string;
  readonly client: MessagingClient;
  readonly provider: string;
  readonly externalId: string;
  currentContactId: string | null;
  currentContactName: string | null;
  firstContactName: string | null;
  contactCount: number;
  noteCount: number;
  factCount: number;
  /** Ambiguous notes parked in the confirmation inbox for the user to resolve.
   *  No cap: every ambiguity gets its own row (see ./ingest-text/route-note). */
  pendingConfirmations: number;
  notices: string[];
  /** Every note this walk filed, and why it went where it went. Rendered into
   *  the closing summary so no attribution guess is ever left unstated. */
  attributions: Array<{ contactName: string; basis: NoteAttributionBasis }>;
}

export function createWalkState(
  userId: string,
  client: MessagingClient,
  chat: { provider: string; externalId: string },
): WalkState {
  return {
    userId,
    client,
    provider: chat.provider,
    externalId: chat.externalId,
    currentContactId: null,
    currentContactName: null,
    firstContactName: null,
    contactCount: 0,
    noteCount: 0,
    factCount: 0,
    pendingConfirmations: 0,
    notices: [],
    attributions: [],
  };
}

/**
 * Record that a note was filed on `contactName`, and on what basis. Called at
 * every point the walk commits a note to a person — the ledger is only honest if
 * it has no gaps, so a new filing path must add a call here.
 */
export function recordAttribution(
  state: WalkState,
  contactName: string,
  basis: NoteAttributionBasis,
): void {
  state.attributions.push({ contactName: contactName || UNNAMED_CONTACT_NAME, basis });
}

/**
 * Point the cursor at a contact WITHOUT counting a new one — used when a note
 * attaches to somebody already in the graph. The summary still names them, but
 * "saved 2 contacts" must only ever mean two contacts were created.
 */
export function focusContact(state: WalkState, contactId: string, name: string): void {
  state.currentContactId = contactId;
  state.currentContactName = name;
  if (!state.firstContactName) state.firstContactName = name;
}

/** Record a newly-CREATED contact as the walk's current cursor. */
export function setCurrentContact(state: WalkState, contactId: string, name: string): void {
  focusContact(state, contactId, name);
  state.contactCount += 1;
}

/** Report something the walk skipped. Deduped: five bad photos say it once. */
export function addNotice(state: WalkState, notice: string): void {
  if (!state.notices.includes(notice)) state.notices.push(notice);
}
