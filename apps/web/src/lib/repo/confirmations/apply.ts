import { randomUUID } from "node:crypto";
import {
  emptyExtractedContact,
  type ConfirmationPayload,
  type EntityLinkPayload,
  type NoteSubjectPayload,
  type SubjectResolutionPayload,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { scheduleCalendarWriteOutForCurrentUserNote } from "@/lib/calendar/write-out";
import { resolveTarget, type EdgeSuggestionTarget } from "../edge-suggestions/confirm";
import { createContact } from "../contacts";
import { upsertEmbedding } from "../embeddings";
import { addNote, verifyFact } from "../notes";
import { applyExtraction } from "../graph/apply-extraction";

/** A note_subject resolution: attach to an EXISTING contact, or CREATE a new
 *  one from the name the user typed (prefilled from the classifier), then
 *  attach. Both thread through applyNoteSubject to the same addNote pipeline. */
export type NoteSubjectChoice =
  | { contactId: string }
  | { createName: string };

/** The user's selection at resolve time. entity_link needs a target (which
 *  candidate, or "create new"); subject_resolution needs the chosen subject;
 *  note_subject needs the person to attach the note to (existing or new).
 *  enrichment_match / supplement carry everything in their payload already. */
export type ConfirmationChoice =
  | { target: EdgeSuggestionTarget }
  | { subjectContactId: string }
  | { noteSubject: NoteSubjectChoice };

/** What the resolver wrote, so callers can revalidate the right pages. `note`
 *  reports the attached-to contact and the freshly minted note so the action
 *  can run fact extraction OUTSIDE the resolve's DB scope (never over an LLM). */
export type ConfirmationResult =
  | { kind: "edge"; dstType: string; dstId: string }
  | { kind: "fact"; factId: string }
  | { kind: "extraction"; contactId: string }
  | { kind: "note"; contactId: string; noteId: string; contactName: string; noteBody: string };

async function applyEntityLink(
  payload: EntityLinkPayload,
  sourceNoteId: string | null,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  if (!choice || !("target" in choice)) {
    throw new Error("entity_link confirmation needs a target choice");
  }
  const db = await getDb();
  const { dstType, dstId } = await resolveTarget(choice.target, payload.apply.objectName);
  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId: payload.apply.srcContactId,
    predicate: payload.apply.predicate,
    dstType,
    dstId,
    sourceNoteId,
  });
  return { kind: "edge", dstType, dstId };
}

async function applySubjectResolution(
  payload: SubjectResolutionPayload,
  sourceNoteId: string | null,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  if (!choice || !("subjectContactId" in choice)) {
    throw new Error("subject_resolution confirmation needs a subject choice");
  }
  const db = await getDb();
  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId: choice.subjectContactId,
    predicate: payload.apply.predicate,
    dstType: payload.apply.dstType,
    dstId: payload.apply.dstId,
    sourceNoteId,
  });
  return { kind: "edge", dstType: payload.apply.dstType, dstId: payload.apply.dstId };
}

/**
 * Attach the pending note to the chosen person — an existing contact, or a new
 * one created from the typed name (a REAL contact, not a "mentioned" stub, so
 * downstream fact extraction runs on it). Mints the note + its embedding here
 * (DB only, inside the resolve scope); the LLM fact-extraction is handled by the
 * caller AFTER this scope releases (see resolveConfirmationAction) so no tenant
 * connection is ever held across the model call — mirrors attachCapturedNoteAction.
 */
async function applyNoteSubject(
  payload: NoteSubjectPayload,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  if (!choice || !("noteSubject" in choice)) {
    throw new Error("note_subject confirmation needs a subject choice");
  }
  const { noteBody } = payload.apply;
  let contactId: string;
  let contactName: string;
  if ("contactId" in choice.noteSubject) {
    contactId = choice.noteSubject.contactId;
    // The chosen contact is always one of the rendered options, whose label is
    // its name — no extra read needed for the extraction subject line.
    const chosen = payload.options.find((option) => option.id === contactId);
    contactName = chosen?.label ?? payload.apply.subjectName ?? "this contact";
  } else {
    contactName = choice.noteSubject.createName.trim();
    contactId = await createContact(
      { ...emptyExtractedContact(), name: contactName },
      "quick_add",
    );
  }
  const noteId = await addNote(contactId, "voice", noteBody);
  await upsertEmbedding("note", noteId, contactId, noteBody);
  return { kind: "note", contactId, noteId, contactName, noteBody };
}

/**
 * Run the deterministic action a confirmation proposed. The KG is mutated ONLY
 * here (never by the AI writer), reusing the same primitives edge_suggestions
 * and extraction already use — resolveTarget, verifyFact, applyExtraction.
 */
export async function applyConfirmation(
  payload: ConfirmationPayload,
  sourceNoteId: string | null,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  switch (payload.type) {
    case "entity_link":
      return applyEntityLink(payload, sourceNoteId, choice);
    case "subject_resolution":
      return applySubjectResolution(payload, sourceNoteId, choice);
    case "note_subject":
      return applyNoteSubject(payload, choice);
    case "enrichment_match":
      await verifyFact(payload.apply.factId);
      return { kind: "fact", factId: payload.apply.factId };
    case "supplement":
      if (!sourceNoteId) {
        throw new Error("supplement confirmation needs a source note receipt");
      }
      await applyExtraction(payload.apply.contactId, sourceNoteId, payload.apply.extraction);
      // A confirmed supplement writes follow-ups through exactly the same
      // applyExtraction the capture path uses, so they have to reach a
      // write-enabled calendar the same way (lib/ai/note-extraction schedules
      // this for the note it just extracted). Registers after() work only: the
      // sync runs post-response in its own short DB scopes, so this mutation's
      // tenant connection is never held across the Google/Microsoft call.
      await scheduleCalendarWriteOutForCurrentUserNote(sourceNoteId);
      return { kind: "extraction", contactId: payload.apply.contactId };
  }
}
