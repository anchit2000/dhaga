/**
 * Lines appended to the CLOSING SUMMARY of a batch, one per thing the walk
 * could not do. Separate from ./replies (which answers a single message) so the
 * "nothing is ever dropped silently" contract has one obvious home: every skip
 * inside ../../../lib/messaging raises one of these.
 */

/** Appended to a summary when the batch was capped at MAX_SESSION_ITEMS. */
export function truncatedNotice(max: number): string {
  return `Only the first ${max} items were processed.`;
}

/** Appended when a stored voice note still could not be transcribed. */
export function voiceSkippedNotice(): string {
  return "A voice note was skipped — transcription isn't configured.";
}

/** The provider wouldn't hand over the bytes (expired media id, network blip). */
export function mediaFailedNotice(): string {
  return "One attachment couldn't be downloaded — forward it again.";
}

/** Neither the card scanner nor the photo reader found anything usable. */
export function photoUnreadableNotice(): string {
  return "I couldn't read a photo — try a sharper, closer shot.";
}

/** A vCard the parser couldn't turn into a person. */
export function cardUnreadableNotice(): string {
  return "A contact card had no readable name, so I skipped it.";
}

/** A pin/attachment that only makes sense once a contact exists in the batch. */
export function orphanItemNotice(): string {
  return "Something arrived before any contact, so there was nobody to attach it to.";
}

/** A stored item whose payload no longer narrows (schema drift, legacy row). */
export function unreadableItemNotice(): string {
  return "One forwarded item couldn't be read, so I skipped it.";
}

/** A second ambiguous note in one batch — only one question is asked at a time. */
export function extraAmbiguityNotice(contactName: string): string {
  return `I couldn't tell who another note was about, so I saved it under a new person, ${contactName}.`;
}
