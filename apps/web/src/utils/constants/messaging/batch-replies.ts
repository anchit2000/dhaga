/**
 * The closing report for a planned batch: one line per person, saying plainly
 * whether they were CREATED or already existed, and what was filed on them.
 *
 * This replaced an "attribution ledger" that reported the basis of each guess
 * (`named` / `new` / `assumed`) beneath a single "Saved N contacts" headline.
 * The ledger existed because the old walk filed notes by positional assumption
 * and the sender was the only one who could catch a wrong guess. The batch
 * planner does not guess positionally — it either knows who a note is about or
 * says it does not — so the honest report is now the OUTCOME per person, which
 * is also what the user asked for: "I created a new contact and then added your
 * note to that newly created contact".
 *
 * Plain text, no markdown: these go out over providers with different (and
 * differently broken) formatting rules, and a stray asterisk in a person's name
 * must never be able to break a message or, worse, get it rejected.
 */

function noteCountLabel(count: number): string {
  return `${count} ${count === 1 ? "note" : "notes"}`;
}

/** A person the batch created, and what was filed on them at the same time. */
export function createdPersonLine(name: string, noteCount: number): string {
  if (noteCount === 0) return `✅ Created ${name}.`;
  return `✅ Created ${name} and added ${noteCountLabel(noteCount)} to them.`;
}

/** A person who was already in the graph. "Added to" not "created" — the
 *  distinction is the whole point of the line, and getting it wrong is how a
 *  user stops trusting the report. */
export function attachedPersonLine(name: string, noteCount: number): string {
  if (noteCount === 0) return `✅ Updated ${name}.`;
  return `✅ Added ${noteCountLabel(noteCount)} to ${name}.`;
}

/**
 * Notes the planner would not attribute. Says where to go, and does NOT ask the
 * question here: chat can hold only one open question at a time, so a batch
 * naming three ambiguous people could only ever resolve the first and would
 * silently turn the rest into duplicate people. The app's inbox has no such cap.
 */
export function needsInputLine(count: number): string {
  const what = count === 1 ? "1 note needs" : `${count} notes need`;
  return `⏳ ${what} your input — open Dhaga to say who ${count === 1 ? "it's" : "they're"} about.`;
}

/**
 * Messages the plan never mentioned. A bug when it happens, which is exactly why
 * it is reported rather than swallowed: the sender learns their message did not
 * land, and the capture log shows which one (CLAUDE.md Rule 12).
 */
export function unaccountedLine(seqs: readonly number[]): string {
  const which = seqs.length === 1 ? `message ${seqs[0]}` : `messages ${seqs.join(", ")}`;
  return `⚠️ I couldn't place ${which} — nothing was saved from ${seqs.length === 1 ? "it" : "them"}. It's in your capture log under Settings → Messaging.`;
}

/** Nothing in the batch could be read at all (every item unreadable). */
export function nothingReadableReply(): string {
  return "🤔 I couldn't read anything in that batch — try forwarding a contact card, a photo of a card, or a message with a name.";
}

/** The whole batch is intact and retryable — say so, because "failed" reads as
 *  "lost" and the one thing a capture tool must never imply is lost input. */
export function batchFailedReply(reason: string): string {
  return `⚠️ ${reason} Nothing was lost — reply DONE to try again.`;
}

/** Why a batch could not be planned, in the sender's terms. Mirrors
 *  MESSAGING_BATCH_FAILURES in ./outcomes; kept as chat copy separately because
 *  the log labels and the chat lines are read in different contexts. */
export const BATCH_FAILURE_REPLIES: Record<string, string> = {
  no_llm: "No AI is configured on this instance, so I couldn't read that batch.",
  over_budget: "You're out of AI credits for this month, so I couldn't read that batch.",
  plan_failed: "I couldn't read that batch.",
  apply_failed: "I read that batch but couldn't finish saving it.",
};

/** The chat sentence for a stored failure code, with a safe generic fallback for
 *  a code this build doesn't know (an older row, or a newer instance). */
export function batchFailureReply(code: string): string {
  return batchFailedReply(BATCH_FAILURE_REPLIES[code] ?? "Something went wrong saving that batch.");
}
