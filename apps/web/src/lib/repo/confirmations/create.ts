import type {
  ConfirmationOption,
  ConfirmationPayload,
  NoteExtraction,
} from "@dhaga/core";
import { insertConfirmation } from "./insert";
import type { ConfirmationView } from "./queue";

/**
 * Typed writers used later by extraction/enrichment. They ONLY insert a
 * pending row — no KG mutation happens until the user confirms (resolve.ts).
 * `contactId` is the contact the row is "about" so the inbox can group/filter
 * and EE can scope it; it is nullable for rows with no single subject yet.
 */
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

/**
 * Raise a "which person is this note about?" confirmation. Carries the pending
 * note body in the payload (no DDL — nothing is attached until the user
 * confirms). `options` are the candidate people (empty ⇒ a pure create-new
 * prompt); `subjectName` prefills the create-new affordance. `contactId` is left
 * null — the subject is exactly what is unresolved, so the row belongs to no
 * single contact yet. Resolving it runs the addNote + fact-extraction pipeline.
 *
 * Returns the full {@link ConfirmationView} (not just the id) so the inline
 * quick-add flow can render it through <ConfirmationCard> immediately, with no
 * re-read and no duplicated payload construction.
 */
export async function createNoteSubjectConfirmation(input: {
  noteBody: string;
  subjectName: string | null;
  question: string;
  options?: ConfirmationOption[];
}): Promise<ConfirmationView> {
  const payload: ConfirmationPayload = {
    type: "note_subject",
    question: input.question,
    options: input.options ?? [],
    apply: {
      kind: "attach_note",
      noteBody: input.noteBody,
      subjectName: input.subjectName,
    },
  };
  const id = await insertConfirmation(payload, null, null);
  return {
    id,
    type: "note_subject",
    payload,
    contactId: null,
    contactName: null,
    sourceNoteId: null,
    createdAt: new Date(),
  };
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
