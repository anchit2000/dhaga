import { randomUUID } from "node:crypto";
import {
  emptyExtractedContact,
  type EntityLinkPayload,
  type NoteSubjectPayload,
  type SubjectResolutionPayload,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { resolveTarget } from "../../edge-suggestions/confirm";
import { createContact } from "../../contacts";
import { upsertEmbedding } from "../../embeddings";
import { addNote } from "../../notes";
import type { ConfirmationChoice, ConfirmationResult } from "./types";

/** The per-type appliers behind `applyConfirmation` — one function per payload
 *  type that writes a graph row. Split from index.ts for the 150-line rule; the
 *  switch that picks between them stays there. */

export async function applyEntityLink(
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

export async function applySubjectResolution(
  payload: SubjectResolutionPayload,
  sourceNoteId: string | null,
  choice: ConfirmationChoice | undefined,
): Promise<ConfirmationResult> {
  if (!choice || !("subjectContactId" in choice || "subjectCreateName" in choice)) {
    throw new Error("subject_resolution confirmation needs a subject choice");
  }
  // "Who is this about?" has no answer in the graph until the person exists, so
  // the picker can create them here rather than dead-ending on "No matches" —
  // the same escape hatch note_subject already offers.
  const srcId =
    "subjectContactId" in choice
      ? choice.subjectContactId
      : await createContact(
          { ...emptyExtractedContact(), name: choice.subjectCreateName.trim() },
          "quick_add",
        );
  const db = await getDb();
  await db.insert(edges).values({
    id: randomUUID(),
    srcType: "contact",
    srcId,
    predicate: payload.apply.predicate,
    dstType: payload.apply.dstType,
    dstId: payload.apply.dstId,
    sourceNoteId,
  });
  return { kind: "edge", dstType: payload.apply.dstType, dstId: payload.apply.dstId };
}

export async function applyNoteSubject(
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
