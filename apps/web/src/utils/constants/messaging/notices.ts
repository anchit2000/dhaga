/**
 * Lines appended to the CLOSING SUMMARY of a batch: one per thing the walk could
 * not do, plus the attribution ledger for what it DID do. Separate from
 * ./replies (which answers a single message) so the "nothing is ever dropped
 * silently, and no guess goes unstated" contract has one obvious home — every
 * skip and every filing decision inside ../../../lib/messaging surfaces here.
 */
import { NOTE_ATTRIBUTION_BASES, type NoteAttributionBasis } from "./config";

/**
 * Appended when a batch was bigger than one run's cap. The remainder is NOT
 * dropped — items carry a per-item processed stamp, so the batch resumes from
 * where it stopped — which is why this says "so far" rather than the old
 * "only the first N were processed".
 */
export function partialRunNotice(done: number, remaining: number): string {
  return `That's the first ${done} items — ${remaining} still to go, I'll keep working through them.`;
}

/**
 * The attribution ledger: one line per person, saying how many notes landed on
 * them and on what basis. A batch spanning a day can cover a dozen people, and
 * every filing decision is a guess the sender is the only one able to check —
 * so the summary states them out loud rather than letting a wrong one pass as
 * silence. Assumed notes are named LAST and in plain words, because they are the
 * ones most likely to be wrong.
 */
export function attributionLines(
  entries: ReadonlyArray<{ contactName: string; basis: NoteAttributionBasis }>,
): string[] {
  if (entries.length === 0) return [];
  const byPerson = new Map<string, Map<NoteAttributionBasis, number>>();
  for (const { contactName, basis } of entries) {
    const tally = byPerson.get(contactName) ?? new Map<NoteAttributionBasis, number>();
    tally.set(basis, (tally.get(basis) ?? 0) + 1);
    byPerson.set(contactName, tally);
  }
  const lines: string[] = [];
  for (const [name, tally] of byPerson) {
    const parts = NOTE_ATTRIBUTION_BASES.filter((basis) => tally.has(basis)).map(
      (basis) => `${tally.get(basis)} ${basisPhrase(basis, tally.get(basis) ?? 0)}`,
    );
    lines.push(`${name}: ${parts.join(", ")}`);
  }
  return lines;
}

function basisPhrase(basis: NoteAttributionBasis, count: number): string {
  const noun = count === 1 ? "note" : "notes";
  switch (basis) {
    case "named":
      return `${noun} that named them`;
    case "new":
      return `${noun} — I created them, nobody matched`;
    case "assumed":
      return `${noun} I ASSUMED were about them (they named nobody)`;
  }
}

/** Header above the ledger, so the lines below are read as guesses to check. */
export function attributionHeader(): string {
  return "Here's where each note went — fix any of these in Dhaga:";
}

/**
 * Ambiguous notes were parked for the user to resolve. Counted, because the
 * whole point of moving these out of chat is that a batch may raise SEVERAL —
 * and a note waiting in the inbox is not a note that was saved.
 */
export function pendingConfirmationsNotice(count: number): string {
  const noun = count === 1 ? "note" : "notes";
  return `${count} ${noun} need you to pick who they're about — open Dhaga → Inbox.`;
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

