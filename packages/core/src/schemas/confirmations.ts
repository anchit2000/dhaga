import { z } from "zod";
import { noteExtractionSchema } from "./extraction";

/**
 * The unified "confirmations / doubts" contract (generalizes edge_suggestions).
 * AI proposes, deterministic code disposes: extraction/enrichment only WRITE a
 * confirmation row carrying a `payload` — the KG (edges/facts) is mutated ONLY
 * by the resolver once the user confirms. So the payload is fully serializable
 * and self-describing: `question` + optional `options` for the UI to render,
 * and `apply` — the exact deterministic action the resolver will execute,
 * never re-derived from free text.
 */

export const CONFIRMATION_TYPES = [
  "entity_link", // which contact/entity does an ambiguous mention point at?
  "enrichment_match", // is this web-sourced (unverified) fact really the person?
  "supplement", // add a batch of newly-extracted facts/edges to a contact?
  "subject_resolution", // whose relationship is this — which subject contact?
  "note_subject", // which person is this captured note about (or create anew)?
] as const;
export type ConfirmationType = (typeof CONFIRMATION_TYPES)[number];

/** A pickable candidate the inbox renders (an existing contact/entity/fact). */
export const confirmationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().nullable(),
});
export type ConfirmationOption = z.infer<typeof confirmationOptionSchema>;

// --- Proposed deterministic actions (discriminated by `kind`) ----------------

/** Write one edge; the dst is chosen from `options` at resolve time. */
export const insertEdgeApplySchema = z.object({
  kind: z.literal("insert_edge"),
  srcContactId: z.string(),
  predicate: z.string(),
  objectName: z.string(),
  objectType: z.enum(["person", "entity"]),
  entityTypeHint: z.string().nullable(),
});

/** Clear the "unverified" badge on an already-written fact (dismiss deletes it). */
export const verifyFactApplySchema = z.object({
  kind: z.literal("verify_fact"),
  factId: z.string(),
});

/** Fold a whole note extraction into a contact via applyExtraction. */
export const applyExtractionApplySchema = z.object({
  kind: z.literal("apply_extraction"),
  contactId: z.string(),
  extraction: noteExtractionSchema,
});

/** Write one edge whose SRC (subject contact) is chosen at resolve time. */
export const resolveSubjectApplySchema = z.object({
  kind: z.literal("resolve_subject"),
  predicate: z.string(),
  dstType: z.enum(["contact", "company", "event", "entity"]),
  dstId: z.string(),
  objectName: z.string(),
});

/**
 * Attach a pending captured note to a person chosen at resolve time — an
 * existing contact OR a brand-new one created from a typed name. The note text
 * rides in the payload (no DDL: nothing is written until the user confirms),
 * and the resolver runs the same addNote + fact-extraction pipeline the silent
 * attach path uses. Distinct from resolve_subject (which writes a graph EDGE and
 * cannot create a contact) — a note is not an edge.
 */
export const attachNoteApplySchema = z.object({
  kind: z.literal("attach_note"),
  noteBody: z.string(),
  // The classifier's subject name, kept so the create-new affordance can prefill
  // it. Nullable: no-match confirmations may still carry a name; ambiguous ones
  // rely on `options`.
  subjectName: z.string().nullable(),
});

// --- Per-type payloads -------------------------------------------------------

export const entityLinkPayloadSchema = z.object({
  type: z.literal("entity_link"),
  question: z.string(),
  options: z.array(confirmationOptionSchema).default([]),
  apply: insertEdgeApplySchema,
});

export const enrichmentMatchPayloadSchema = z.object({
  type: z.literal("enrichment_match"),
  question: z.string(),
  options: z.array(confirmationOptionSchema).default([]),
  apply: verifyFactApplySchema,
});

export const supplementPayloadSchema = z.object({
  type: z.literal("supplement"),
  question: z.string(),
  options: z.array(confirmationOptionSchema).default([]),
  apply: applyExtractionApplySchema,
});

export const subjectResolutionPayloadSchema = z.object({
  type: z.literal("subject_resolution"),
  question: z.string(),
  options: z.array(confirmationOptionSchema).default([]),
  apply: resolveSubjectApplySchema,
});

export const noteSubjectPayloadSchema = z.object({
  type: z.literal("note_subject"),
  question: z.string(),
  // Candidate people to attach the note to (empty ⇒ a pure "create new" prompt).
  options: z.array(confirmationOptionSchema).default([]),
  apply: attachNoteApplySchema,
});

/** The stored `confirmations.payload` — discriminated by `type`. */
export const confirmationPayloadSchema = z.discriminatedUnion("type", [
  entityLinkPayloadSchema,
  enrichmentMatchPayloadSchema,
  supplementPayloadSchema,
  subjectResolutionPayloadSchema,
  noteSubjectPayloadSchema,
]);

export type InsertEdgeApply = z.infer<typeof insertEdgeApplySchema>;
export type VerifyFactApply = z.infer<typeof verifyFactApplySchema>;
export type ApplyExtractionApply = z.infer<typeof applyExtractionApplySchema>;
export type ResolveSubjectApply = z.infer<typeof resolveSubjectApplySchema>;
export type AttachNoteApply = z.infer<typeof attachNoteApplySchema>;
export type EntityLinkPayload = z.infer<typeof entityLinkPayloadSchema>;
export type EnrichmentMatchPayload = z.infer<typeof enrichmentMatchPayloadSchema>;
export type SupplementPayload = z.infer<typeof supplementPayloadSchema>;
export type SubjectResolutionPayload = z.infer<typeof subjectResolutionPayloadSchema>;
export type NoteSubjectPayload = z.infer<typeof noteSubjectPayloadSchema>;
export type ConfirmationPayload = z.infer<typeof confirmationPayloadSchema>;
