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

/** The stored `confirmations.payload` — discriminated by `type`. */
export const confirmationPayloadSchema = z.discriminatedUnion("type", [
  entityLinkPayloadSchema,
  enrichmentMatchPayloadSchema,
  supplementPayloadSchema,
  subjectResolutionPayloadSchema,
]);

export type InsertEdgeApply = z.infer<typeof insertEdgeApplySchema>;
export type VerifyFactApply = z.infer<typeof verifyFactApplySchema>;
export type ApplyExtractionApply = z.infer<typeof applyExtractionApplySchema>;
export type ResolveSubjectApply = z.infer<typeof resolveSubjectApplySchema>;
export type EntityLinkPayload = z.infer<typeof entityLinkPayloadSchema>;
export type EnrichmentMatchPayload = z.infer<typeof enrichmentMatchPayloadSchema>;
export type SupplementPayload = z.infer<typeof supplementPayloadSchema>;
export type SubjectResolutionPayload = z.infer<typeof subjectResolutionPayloadSchema>;
export type ConfirmationPayload = z.infer<typeof confirmationPayloadSchema>;
