import { randomUUID } from "node:crypto";
import type {
  ConfirmationOption,
  ConfirmationPayload,
  NoteExtraction,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { confirmations } from "@/lib/db/schema";

/**
 * Typed writers used later by extraction/enrichment. They ONLY insert a
 * pending row — no KG mutation happens until the user confirms (resolve.ts).
 * `contactId` is the contact the row is "about" so the inbox can group/filter
 * and EE can scope it; it is nullable for rows with no single subject yet.
 */
async function insertConfirmation(
  payload: ConfirmationPayload,
  sourceNoteId: string | null,
  contactId: string | null,
): Promise<string> {
  const db = await getDb();
  const id = randomUUID();
  await db.insert(confirmations).values({ id, type: payload.type, payload, sourceNoteId, contactId });
  return id;
}

export async function createEntityLinkConfirmation(input: {
  srcContactId: string;
  predicate: string;
  objectName: string;
  objectType: "person" | "entity";
  entityTypeHint: string | null;
  options?: ConfirmationOption[];
  sourceNoteId: string | null;
  question?: string;
}): Promise<string> {
  const payload: ConfirmationPayload = {
    type: "entity_link",
    question: input.question ?? `Which "${input.objectName}" does this refer to?`,
    options: input.options ?? [],
    apply: {
      kind: "insert_edge",
      srcContactId: input.srcContactId,
      predicate: input.predicate,
      objectName: input.objectName,
      objectType: input.objectType,
      entityTypeHint: input.entityTypeHint,
    },
  };
  return insertConfirmation(payload, input.sourceNoteId, input.srcContactId);
}

export async function createEnrichmentMatchConfirmation(input: {
  factId: string;
  contactId: string;
  question: string;
  options?: ConfirmationOption[];
  sourceNoteId: string | null;
}): Promise<string> {
  const payload: ConfirmationPayload = {
    type: "enrichment_match",
    question: input.question,
    options: input.options ?? [],
    apply: { kind: "verify_fact", factId: input.factId },
  };
  return insertConfirmation(payload, input.sourceNoteId, input.contactId);
}

export async function createSupplementConfirmation(input: {
  contactId: string;
  extraction: NoteExtraction;
  question: string;
  options?: ConfirmationOption[];
  sourceNoteId: string;
}): Promise<string> {
  const payload: ConfirmationPayload = {
    type: "supplement",
    question: input.question,
    options: input.options ?? [],
    apply: { kind: "apply_extraction", contactId: input.contactId, extraction: input.extraction },
  };
  return insertConfirmation(payload, input.sourceNoteId, input.contactId);
}

export async function createSubjectResolutionConfirmation(input: {
  predicate: string;
  dstType: "contact" | "company" | "event" | "entity";
  dstId: string;
  objectName: string;
  question: string;
  options?: ConfirmationOption[];
  sourceNoteId: string | null;
  contactId?: string | null;
}): Promise<string> {
  const payload: ConfirmationPayload = {
    type: "subject_resolution",
    question: input.question,
    options: input.options ?? [],
    apply: {
      kind: "resolve_subject",
      predicate: input.predicate,
      dstType: input.dstType,
      dstId: input.dstId,
      objectName: input.objectName,
    },
  };
  return insertConfirmation(payload, input.sourceNoteId, input.contactId ?? null);
}
