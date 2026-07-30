import { emptyExtractedContact } from "@dhaga/core";
import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { clearPendingQuestions, type PendingQuestion } from "@/lib/repo/messaging";
import {
  parseQuestionAnswer,
  questionAbandonedReply,
  questionAnsweredReply,
} from "@/utils/constants/messaging";
import { createContactWithNote, extractNoteFacts, saveNoteWithFacts } from "./note-write";

/**
 * Resolving the one open "which person did you mean?" question for a chat.
 *
 * Deliberately NOT a conversation state machine — there are exactly two
 * outcomes and no waiting states:
 *
 * - `answered`  — the reply picked a person (by number or name) or asked for a
 *                 new one; the pending note is written and the message is done.
 * - `released`  — the reply wasn't an answer (or the question had expired), so
 *                 the note is saved under a new person, the sender is told, and
 *                 the message carries on as ordinary content.
 *
 * Either way the question row is cleared and the note is written: the sender can
 * never be trapped in a question, and an unanswered question never loses a note.
 */
export type PendingOutcome = "answered" | "released";

/** The pending note under a brand-new person — the never-lose-it fallback. */
async function saveUnderNewPerson(userId: string, pending: PendingQuestion): Promise<string> {
  const name = pending.subjectName?.trim() || "Unnamed contact";
  const { contactId, noteId } = await createContactWithNote(
    userId,
    { ...emptyExtractedContact(), name },
    "capture_source",
    pending.noteBody,
  );
  if (noteId) {
    await extractNoteFacts({
      userId,
      contactId,
      noteId,
      contactName: name,
      body: pending.noteBody,
    });
  }
  return name;
}

export async function resolvePendingQuestion(input: {
  client: MessagingClient;
  msg: NormalizedInboundMessage;
  userId: string;
  pending: PendingQuestion;
}): Promise<PendingOutcome> {
  const { client, msg, userId, pending } = input;
  const externalUserId = msg.externalUserId;
  const text = msg.content.type === "text" ? msg.content.text : null;
  // An expired question is never answerable: a "1" typed an hour later must not
  // attach a note to whoever happened to be first in a forgotten list.
  const expired = pending.expiresAt.getTime() <= Date.now();
  const answer = text !== null && !expired ? parseQuestionAnswer(pending.options, text) : null;

  // Clear FIRST: whatever happens below, this question is over — and a failure
  // mid-write must not leave a question that would re-eat the next message.
  await withUserDb(userId, () =>
    clearPendingQuestions({ provider: msg.provider, externalId: externalUserId }),
  );

  if (answer?.kind === "option") {
    await saveNoteWithFacts({
      userId,
      contactId: answer.contactId,
      contactName: answer.label,
      kind: "text",
      body: pending.noteBody,
    });
    await client.sendText({ externalUserId, text: questionAnsweredReply(answer.label) });
    return "answered";
  }

  const name = await saveUnderNewPerson(userId, pending);
  if (answer?.kind === "new") {
    await client.sendText({ externalUserId, text: questionAnsweredReply(name) });
    return "answered";
  }
  await client.sendText({ externalUserId, text: questionAbandonedReply(name) });
  return "released";
}
