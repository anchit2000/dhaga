/**
 * Every reply the bot sends in answer to ONE forwarded message, as pure
 * builders — no side effects, so the case tests assert on the exact string a
 * case produces. The lines appended to a batch's closing summary live in
 * ./notices.
 */
import { idleWindowLabel } from "./config";

export function notRecognizedReply(): string {
  return "👋 I don't recognize this chat yet. Open Dhaga → Settings → Messaging, generate a link token, and send it here to connect your account.";
}

export function linkedReply(): string {
  return "✅ Connected! Forward contact cards, notes, or photos here and I'll turn them into people in your graph. Reply DONE when you're finished.";
}

export function invalidTokenReply(): string {
  return "⚠️ That link token isn't valid or has expired. Generate a fresh one in Dhaga → Settings → Messaging and send it here.";
}

export function ackFirstItemReply(): string {
  return "👍 Got it — keep forwarding, then reply DONE to save. Best one person at a time: notes covering several people can end up on the wrong one. (I'll auto-save after " + idleWindowLabel() + " of quiet.)";
}

/**
 * The open batch is full and nothing more is accepted until it is saved. Said
 * plainly and with the count, because the alternative — quietly swallowing an
 * eleventh forward — is the sender losing a contact and never knowing.
 */
export function batchFullReply(limit: number): string {
  return `⛔ This batch already has ${limit} items and isn't saved yet. Reply DONE to save it — I can't take anything more until you do, or I'd start guessing who each note belongs to.`;
}

export function processingReply(itemCount: number): string {
  const noun = itemCount === 1 ? "item" : "items";
  return `⏳ Processing ${itemCount} ${noun}… I'll send a summary in a moment.`;
}

export function emptySessionReply(): string {
  return "Nothing to save yet — forward a contact card, note, or photo first, then reply DONE.";
}

/** A message with no usable content (an empty caption, a blank forward). */
export function emptyMessageReply(): string {
  return "🤔 That message came through empty — send some text, a photo, or a contact card.";
}

/**
 * Voice notes are refused, not swallowed. Gated on whether a transcription
 * provider is actually registered (see @dhaga/core/src/transcription), so this
 * reply disappears by itself the day one is plugged in.
 */
export function voiceUnsupportedReply(): string {
  return "🎤 Voice notes aren't supported yet — coming soon! For now please type it, send a photo, or forward a contact.";
}

/** An attachment kind the capture pipeline has nothing to do with. */
export function unsupportedAttachmentReply(description: string): string {
  return `📎 I can't read a ${description} yet — send a photo of a card, type a note, or forward a contact card.`;
}

export function summaryReply(input: {
  contactName: string | null;
  contactCount: number;
  noteCount: number;
  factCount: number;
}): string {
  const who = input.contactName
    ? input.contactName
    : `${input.contactCount} ${input.contactCount === 1 ? "contact" : "contacts"}`;
  const parts = [
    `${input.noteCount} ${input.noteCount === 1 ? "note" : "notes"}`,
    `${input.factCount} ${input.factCount === 1 ? "fact" : "facts"}`,
  ];
  return `✅ Saved ${who} — ${parts.join(", ")}. Open Dhaga to review.`;
}

/** Batch had items but none resolved to a contact — nudge toward a usable forward. */
export function noContactFoundReply(): string {
  return "🤔 I couldn't find a contact in that batch — try forwarding a contact card or a message with a name.";
}

/** The batch produced nothing except an open question — say that, not "nothing found". */
export function awaitingAnswerReply(): string {
  return "⏳ Nothing saved yet — open Dhaga → Inbox and pick who that note is about.";
}

/** Processing threw. Nothing is lost (items stay), so invite a retry. */
export function processingFailedReply(): string {
  return "⚠️ Something went wrong saving that batch — nothing was lost. Reply DONE to try again.";
}

/** Note body for a forwarded location pin. */
export function locationNoteBody(label: string): string {
  return "📍 Location: " + label;
}

/**
 * The question a note-subject confirmation asks in the app's inbox. No numbered
 * list and no "reply with…": the candidates are rendered as buttons there, and
 * asking in chat could only ever resolve ONE ambiguity per batch while quietly
 * turning the rest into duplicate people.
 */
export function chooseContactQuestion(subjectName: string | null): string {
  const who = subjectName ? `more than one "${subjectName}"` : "more than one person";
  return `This note could be about ${who}. Which one did you mean?`;
}
