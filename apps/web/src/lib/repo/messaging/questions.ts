import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { messagingPendingQuestions } from "@/lib/db/schema";
import {
  MESSAGING_QUESTION_TTL_MINUTES,
  type MessagingQuestionOption,
} from "@/utils/constants/messaging";

/**
 * TENANT-scoped access (messaging_pending_questions) — like sessions.ts, every
 * function here runs INSIDE a withUserDb(userId) scope and takes no userId.
 *
 * At most ONE question is open per chat at a time: the walk only asks when
 * getPendingQuestion() returns null, and answering (or abandoning) clears it.
 * That keeps disambiguation a single short-lived record rather than a
 * conversational state machine. NEVER log note_body (third-party PII).
 */

export interface PendingQuestion {
  id: string;
  subjectName: string | null;
  noteBody: string;
  options: MessagingQuestionOption[];
  expiresAt: Date;
}

/** Narrow the jsonb column back to the option shape; a drifted row yields []. */
function readOptions(value: unknown): MessagingQuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.contactId !== "string" || typeof record.label !== "string") return [];
    return [{
      contactId: record.contactId,
      label: record.label,
      sublabel: typeof record.sublabel === "string" ? record.sublabel : null,
    }];
  });
}

/**
 * The newest open question for a chat, expired or not — the caller compares
 * `expiresAt` itself, because an expired question still has to be cleared (and
 * its pending note saved) rather than left behind as a stale row.
 */
export async function getPendingQuestion(input: {
  provider: string;
  externalId: string;
}): Promise<PendingQuestion | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(messagingPendingQuestions)
    .where(
      and(
        eq(messagingPendingQuestions.provider, input.provider),
        eq(messagingPendingQuestions.externalId, input.externalId),
      ),
    )
    .orderBy(desc(messagingPendingQuestions.createdAt))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    subjectName: row.subjectName,
    noteBody: row.noteBody,
    options: readOptions(row.options),
    expiresAt: row.expiresAt,
  };
}

/** Open a question for this chat. Callers must check getPendingQuestion() first. */
export async function createPendingQuestion(input: {
  provider: string;
  externalId: string;
  subjectName: string | null;
  noteBody: string;
  options: MessagingQuestionOption[];
}): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(messagingPendingQuestions).values({
    id,
    provider: input.provider,
    externalId: input.externalId,
    subjectName: input.subjectName,
    noteBody: input.noteBody,
    options: input.options,
    expiresAt: new Date(Date.now() + MESSAGING_QUESTION_TTL_MINUTES * 60_000),
  });
  return id;
}

/** Close every question for a chat (answered, abandoned, or long expired). */
export async function clearPendingQuestions(input: {
  provider: string;
  externalId: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(messagingPendingQuestions)
    .where(
      and(
        eq(messagingPendingQuestions.provider, input.provider),
        eq(messagingPendingQuestions.externalId, input.externalId),
      ),
    );
}
