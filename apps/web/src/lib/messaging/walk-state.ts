import type { MessagingClient } from "@dhaga/core/src/messaging";

/**
 * Mutable state threaded through the positional walk of a session's items.
 * `currentContactId` is the "cursor": a contact-establishing item (contact
 * card, card-scan image, or the first free-text with no contact yet) sets it,
 * and every following note/location attaches to it until the next one resets
 * it. Counters feed the closing summary. No PII is ever logged from here.
 */
export interface WalkState {
  readonly userId: string;
  readonly client: MessagingClient;
  currentContactId: string | null;
  currentContactName: string | null;
  firstContactName: string | null;
  contactCount: number;
  noteCount: number;
  factCount: number;
  droppedVoiceNote: boolean;
}

export function createWalkState(userId: string, client: MessagingClient): WalkState {
  return {
    userId,
    client,
    currentContactId: null,
    currentContactName: null,
    firstContactName: null,
    contactCount: 0,
    noteCount: 0,
    factCount: 0,
    droppedVoiceNote: false,
  };
}

/** Record a newly-established contact as the walk's current cursor. */
export function setCurrentContact(state: WalkState, contactId: string, name: string): void {
  state.currentContactId = contactId;
  state.currentContactName = name;
  if (!state.firstContactName) state.firstContactName = name;
  state.contactCount += 1;
}
