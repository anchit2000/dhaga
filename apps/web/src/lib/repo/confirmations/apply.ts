import { randomUUID } from "node:crypto";
import type {
  ConfirmationPayload,
  EntityLinkPayload,
  SubjectResolutionPayload,
} from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { resolveTarget, type EdgeSuggestionTarget } from "../edge-suggestions/confirm";
import { verifyFact } from "../notes";
import { applyExtraction } from "../graph/apply-extraction";

/** The user's selection at resolve time. entity_link needs a target (which
 *  candidate, or "create new"); subject_resolution needs the chosen subject.
 *  enrichment_match / supplement carry everything in their payload already. */
export type ConfirmationChoice =
  | { target: EdgeSuggestionTarget }
  | { subjectContactId: string };

/** What the resolver wrote, so callers can revalidate the right pages. */
export type ConfirmationResult =
  | { kind: "edge"; dstType: string; dstId: string }
  | { kind: "fact"; factId: string }
  | { kind: "extraction"; contactId: string };

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
    case "enrichment_match":
      await verifyFact(payload.apply.factId);
      return { kind: "fact", factId: payload.apply.factId };
    case "supplement":
      if (!sourceNoteId) {
        throw new Error("supplement confirmation needs a source note receipt");
      }
      await applyExtraction(payload.apply.contactId, sourceNoteId, payload.apply.extraction);
      return { kind: "extraction", contactId: payload.apply.contactId };
  }
}
